/* eslint-disable react/jsx-no-undef */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Joystick } from 'react-joystick-component'
import { Game } from '@/game/Game'
import Link from 'next/link'
import { SerializedMessageType } from '@shared/network/server/serialized'
import { MessageComponent } from '@shared/component/MessageComponent'
import { Maximize } from 'lucide-react'
import { MicroGameCard } from './GameCard'
import { GameInfo } from '@/types'
import gameData from '../public/gameData.json'
import { VehicleSystem } from '../game/ecs/system/VehicleSystem.js'
import { createSolanaClient, GetTokenAccountBalanceApi } from "gill";
import { address } from "@solana/kit";
import { Connection, GetProgramAccountsFilter, PublicKey, clusterApiUrl, ParsedAccountData } from "@solana/web3.js";
import { ENV, TokenListProvider, TokenInfo } from '@solana/spl-token-registry';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Metaplex } from '@metaplex-foundation/js';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import {
  Metadata,
  findMetadataPda,
} from '@metaplex-foundation/mpl-token-metadata';;
import axios from 'axios';
import { PythHttpClient, getPythClusterApiUrl } from "@pythnetwork/client";

// Extend the Window interface to include wallet providers
declare global {
  interface Window {
    phantom?: any;
    solflare?: any;
    backpack?: any;
  }
}

export interface GameHudProps {
  messages: MessageComponent[]
  sendMessage: (message: string) => void
  gameInstance: Game
}

export default function GameHud({
  messages: messageComponents,
  sendMessage,
  gameInstance,
}: GameHudProps) {
  // ...existing code...

  const [entities, setEntities] = useState<any[]>([]); // Store ECS entities
  const vehicleSystem = new VehicleSystem();

  // Helper to add a vehicle entity
  function addWoodCubeEntity() {
    // Send a SPAWN_CUBE message to the server via websocket
    const spawnCubeMessage = {
      t: 5, // ClientMessageType.SPAWN_CUBE
      position: { x: 0, y: 10, z: 0 },
      size: { width: 3, height: 3, depth: 3 },
      color: '#deb887', // Wood color, optional
    };
    if (gameInstance?.websocketManager) {
      gameInstance.websocketManager.send(spawnCubeMessage);
      console.log('[WoodCubeDebug] Sent SPAWN_CUBE message to server', spawnCubeMessage);
    } else {
      console.warn('[WoodCubeDebug] gameInstance.websocketManager not found');
    }
  }
  // Loading state for each address
  const [loadingPortfolio, setLoadingPortfolio] = useState<{[address: string]: boolean}>({});
  // Track live token count per address
  const [liveTokenCount, setLiveTokenCount] = useState<{[address: string]: number}>({});

  // Track token prices by mint address
  const [tokenPrices, setTokenPrices] = useState<{[mint: string]: number | null}>({});
  // Track price loading state per wallet
  const [loadingPrice, setLoadingPrice] = useState<{[address: string]: boolean}>({});

  // Track last CoinGecko API call time to implement rate limiting
  const [lastCoinGeckoCall, setLastCoinGeckoCall] = useState<number>(0);

  // Fetch price for a CoinGecko ID with rate limiting to avoid 429 Too Many Requests errors
  async function fetchTokenPrice(coinGeckoId: string): Promise<number | null> {
    try {
      // Implement rate limiting for CoinGecko API
      const now = Date.now();
      const timeSinceLastCall = now - lastCoinGeckoCall;
      const minimumInterval = 6500; // At least 6.1 seconds between calls (CoinGecko free tier limit is ~10 calls per minute)
      
      // If we need to wait before making another call
      if (timeSinceLastCall < minimumInterval) {
        const waitTime = minimumInterval - timeSinceLastCall;
        console.log(`Rate limiting CoinGecko API - waiting ${waitTime}ms before next call`);
        await sleep(waitTime);
      }
      
      // Update the last call time
      setLastCoinGeckoCall(Date.now());
      
      // Make the API call with error handling
      console.log(`Fetching CoinGecko price for: ${coinGeckoId}`);
      const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`);
      
      if (res.status === 429) {
        console.error("CoinGecko rate limit exceeded (429 error). Implementing longer delay.");
        await sleep(10000); // 10 second cooldown if we hit the rate limit
        return null;
      }
      
      return res.data[coinGeckoId]?.usd ?? null;
    } catch (error) {
      // Check if error is specifically a rate limit error
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        console.error("CoinGecko rate limit exceeded (429 error). Need to wait longer between requests.");
      } else {
        console.error("Error fetching price from CoinGecko:", error);
      }
      return null;
    }
  }

  // Helper function to get price from Jupiter API
  async function getJupiterPrice(mintAddress: string): Promise<number | null> {
    try {
      // Type validation to ensure mintAddress is a string
      if (!mintAddress || typeof mintAddress !== 'string') {
        console.warn('Invalid mintAddress passed to getJupiterPrice:', mintAddress);
        return null;
      }

      // Jupiter API endpoint for price data
      const jupiterPriceEndpoint = `https://price.jup.ag/v4/price?ids=${mintAddress}`;
      
      // Make the API call with error handling
      console.log(`Fetching Jupiter price for: ${mintAddress}`);
      
      // Use a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await axios.get(jupiterPriceEndpoint, {
          signal: controller.signal,
          validateStatus: (status) => {
            // Consider any status code as successful to handle them manually
            return true;
          }
        });
        
        // Clear the timeout since the request completed
        clearTimeout(timeoutId);
        
        // Handle non-200 status codes
        if (response.status !== 200) {
          // Handle silently - just log the issue
          console.warn(`Failed to fetch Jupiter price, status: ${response.status} for mint: ${mintAddress}`);
          return null;
        }
        
        // Extract price from Jupiter response
        const priceData = response.data?.data?.[mintAddress];
        if (priceData && typeof priceData.price === 'number') {
          return priceData.price;
        } else {
          // Token exists in Jupiter but no price data available
          console.warn(`Price information not found in Jupiter API for mintAddress: ${mintAddress}`);
          return null;
        }
      } catch (innerError) {
        // Clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);
        
        // Handle abort errors silently
        if (innerError.name === 'AbortError') {
          console.warn(`Jupiter API request timed out for mintAddress: ${mintAddress}`);
          return null;
        }
        
        // Handle other fetch errors silently
        console.warn(`Error fetching from Jupiter API for mintAddress: ${mintAddress}`, innerError);
        return null;
      }
    } catch (error) {
      // Catch and handle any other unexpected errors silently
      console.warn(`Failed to fetch price from Jupiter API for mintAddress: ${mintAddress}`, error);
      return null;
    }
  }

  // Helper function to get price from Binance API
  async function getBinancePrice(symbol: string | null): Promise<number | null> {
    try {
      // Type validation to ensure symbol is a string
      if (!symbol || typeof symbol !== 'string') {
        console.warn('Invalid symbol passed to getBinancePrice:', symbol);
        return null;
      }

      // Format the symbol for Binance API (append USDT and remove any spaces, make uppercase)
      const formattedSymbol = `${symbol.replace(/\s+/g, '').toUpperCase()}USDT`;
      
      // First check if this market exists on Binance
      try {
        // Binance API endpoint for exchange info
        const exchangeInfoEndpoint = 'https://api.binance.com/api/v3/exchangeInfo';
        const exchangeInfoResponse = await axios.get(exchangeInfoEndpoint);
        
        if (exchangeInfoResponse.status !== 200) {
          console.error(`Failed to fetch Binance exchange info, status: ${exchangeInfoResponse.status}`);
          return null;
        }
        
        // Check if the symbol exists in the available symbols
        const symbolExists = exchangeInfoResponse.data.symbols.some(
          (marketInfo: any) => marketInfo.symbol === formattedSymbol && marketInfo.status === 'TRADING'
        );
        
        if (!symbolExists) {
          console.warn(`Market ${formattedSymbol} does not exist on Binance or is not currently trading`);
          return null;
        }
        
        console.log(`Market ${formattedSymbol} exists on Binance, proceeding to fetch price`);
      } catch (error) {
        console.error('Error checking if market exists on Binance:', error);
        // Continue with price fetch attempt even if market check fails
      }
      
      // Binance API endpoint for price data
      const binancePriceEndpoint = `https://api.binance.com/api/v3/ticker/price?symbol=${formattedSymbol}`;
      
      // Make the API call with error handling
      console.log(`Fetching Binance price for: ${formattedSymbol}`);
      const response = await axios.get(binancePriceEndpoint);
      
      if (response.status !== 200) {
        console.error(`Failed to fetch Binance price, status: ${response.status}`);
        return null;
      }
      
      // Extract price from Binance response
      if (response.data && typeof response.data.price === 'string') {
        const price = parseFloat(response.data.price);
        if (!isNaN(price)) {
          return price;
        }
      }

      console.warn(`Price information not found in Binance API for symbol: ${symbol}`);
      return null;
    } catch (error) {
      // Check if error is specifically a Not Found error (symbol doesn't exist)
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        console.warn(`Symbol ${symbol} not found on Binance API`);
      } else {
        console.error(`Failed to fetch price from Binance API for symbol: ${symbol}`, error);
      }
      return null;
    }
  }

  // Refresh all token prices for a wallet
  async function refreshTokenPrices(address: string) {
    setLoadingPrice(prev => ({ ...prev, [address]: true }));
    const tokens = wallet[address] || [];
    const newPrices: {[mint: string]: number | null} = {};
    
    for (const token of tokens) {
      console.log("Processing token:", token);
      
      // Skip NFTs - don't attempt to fetch price for NFTs
      if (token.tokenIsNFT) {
        console.log(`Skipping price fetch for NFT: ${token.name || token.mint}`);
        newPrices[token.mint] = null;
        continue;
      }
      
      // Get token symbol if not already available
      const symbol = token.symbol || await getTokenSymbolReturnSymbol(token.mint);

      // Skip tokens with null symbol - can't fetch price without a symbol
      if (symbol === null) {
        console.log(`Skipping price fetch for token with null symbol: ${token.name || token.mint}`);
        newPrices[token.mint] = null;
        continue;
      }
      
      let price = null;
      let priceSource = "";
      
      // First try to get price from Binance using the token symbol
      const binancePrice = await getBinancePrice(symbol);
      if (binancePrice !== null) {
        price = binancePrice;
        priceSource = "Binance";
        console.log(`${symbol.toUpperCase()} Price (USD) from Binance: $${price}`);
      } else {
        // Second, try CoinGecko if not available on Binance
        const coinGeckoId = await findCoinGeckoId(symbol);
        if (coinGeckoId) {
          await sleep(500); // 500ms delay between requests to avoid rate limiting
          price = await fetchTokenPrice(coinGeckoId);
          priceSource = "CoinGecko";
          console.log(`${symbol.toUpperCase()} Price (USD) from CoinGecko: $${price}`);
        } else {
          // Finally, fallback to Jupiter API if not available on Binance or CoinGecko
          const jupiterPrice = await getJupiterPrice(token.mint);
          if (jupiterPrice !== null) {
            price = jupiterPrice;
            priceSource = "Jupiter";
            console.log(`${symbol.toUpperCase()} Price (USD) from Jupiter: $${price}`);
          } else {
            console.log(`No price found for ${symbol} on Binance, CoinGecko or Jupiter`);
          }
        }
      }
      
      newPrices[token.mint] = price;
      
      // Update the token in the wallet with its price and symbol
      const tokenIndex = wallet[address].findIndex(t => t.mint === token.mint);
      if (tokenIndex !== -1) {
        setWallet(prev => {
          const newWallet = { ...prev };
          // Calculate valueStableCoin (balance * price)
          const valueStableCoin = price !== null ? token.balance * price : null;
          const updatedToken = { 
            ...newWallet[address][tokenIndex], 
            price, 
            symbol,
            priceSource, // Store the source of the price data
            valueStableCoin // Add the calculated value in USD
          };
          newWallet[address] = [
            ...newWallet[address].slice(0, tokenIndex),
            updatedToken,
            ...newWallet[address].slice(tokenIndex + 1)
          ];
          return newWallet;
        });
      }
      
      await sleep(1000); // 1s delay between requests to avoid rate limiting
    }
    
    // Merge newPrices into wallet for entries with matching address keys
    setWallet(prev => {
      const updatedWallet = { ...prev };
      
      // If this address exists in the wallet
      if (updatedWallet[address]) {
        // Update each token with its new price data and calculate valueStableCoin
        updatedWallet[address] = updatedWallet[address].map(token => {
          if (token.mint in newPrices) {
            const price = newPrices[token.mint];
            // Calculate valueStableCoin (balance * price)
            const valueStableCoin = price !== null ? token.balance * price : null;
            return {
              ...token,
              price,
              valueStableCoin
            };
          }
          return token;
        });
      }
      console.log("Updated wallet:", updatedWallet);
      return updatedWallet;
    });
    
    // Store the prices in the tokenPrices state as well (for backward compatibility)
    setTokenPrices(prev => ({ ...prev, ...newPrices }));
    
    // Count non-NFT tokens with prices for the notification
    const tokensWithPrice = Object.entries(newPrices)
      .filter(([mint, price]) => {
        const token = wallet[address].find(t => t.mint === mint);
        return price !== null && !token?.tokenIsNFT;
      }).length;
    
    if (tokensWithPrice > 0) {
      const notifId = Date.now();
      setNotifications([{ 
        id: notifId, 
        content: `Updated prices for ${tokensWithPrice} token${tokensWithPrice !== 1 ? 's' : ''}`, 
        author: "Price Oracle", 
        timestamp: notifId 
      }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }, 5000);
    }
    
    setLoadingPrice(prev => ({ ...prev, [address]: false }));
  }

  // Check portfolio for a single address
  async function checkPortfolioForAddress(address: string) {
    setLoadingPortfolio(prev => ({ ...prev, [address]: true }));
    setLiveTokenCount(prev => ({ ...prev, [address]: 0 }));
    let newWallet = { ...wallet };
    let tokenAccounts: any[] = [];
    let totalTokens = 0;
    try {
      // Custom getTokenAccounts logic to update live count
      const filters: any[] = [
        {
          dataSize: 165,
        },
        {
          memcmp: {
            offset: 32,
            bytes: address,
          },
        },
      ];
      const accounts = await solanaConnection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID,
        { filters: filters }
      );
      const tokens: Array<{ mint: string; balance: number; name?: string | null; symbol?: string | null; logo?: string | null; tokenIsNFT?: boolean; valueStableCoin?: number | null }> = [];
      for (const [i, account] of accounts.entries()) {
        if (i >= 4) break;
        const parsedAccountInfo: any = account.account.data;
        const mintAddress: string = parsedAccountInfo["parsed"]["info"]["mint"];
        const tokenBalance: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
        const decimals: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["decimals"];
        const metadata = await getTokenMetadata(mintAddress);
        console.log(metadata)
        console.log(metadata?.symbol)
        const tokenIsNFT = decimals === 0 && tokenBalance === 1;
        // Initialize valueStableCoin as null - will be populated when prices are available
        tokens.push({ mint: mintAddress, balance: tokenBalance, ...metadata, tokenIsNFT, valueStableCoin: null });
        setLiveTokenCount(prev => ({ ...prev, [address]: i + 1 }));

        // --- SPAWN A COIN CUBE FOR THIS TOKEN ---
        if (gameInstance?.websocketManager) {
          const spawnCubeCoinMessage = {
            t: 6, // ClientMessageType.SPAWN_CUBE_COIN
            position: { x: i * 5, y: 10, z: 0 }, // Spread cubes along x axis
            size: { width: 2, height: 2, depth: 2 },
            color: '#00ff00', // Green color for coins
            textureUrl: metadata?.logo || undefined, // Use token logo as texture if available
            symbol: metadata?.symbol || 'TOKEN',
            mintAddress: mintAddress
          };
          
          try {
            gameInstance.websocketManager.send(spawnCubeCoinMessage);
            console.log('[WalletCoin] Sent SPAWN_CUBE_COIN for token', metadata?.symbol, mintAddress);
          } catch (error) {
            console.error('[WalletCoin] Failed to send SPAWN_CUBE_COIN message:', error);
            
            // Fallback to regular cube if message fails
            try {
              const fallbackMessage = {
                t: 5, // ClientMessageType.SPAWN_CUBE
                position: { x: i * 5, y: 10, z: 0 },
                size: { width: 2, height: 2, depth: 2 },
                color: '#deb887', // Wood color fallback
              };
              gameInstance.websocketManager.send(fallbackMessage);
              console.log('[WalletCoin] Sent fallback SPAWN_CUBE message');
            } catch (fallbackError) {
              console.error('[WalletCoin] Even fallback message failed:', fallbackError);
            }
          }
        }
        // --- END SPAWN COIN CUBE ---

        // Wait 550ms before next call
        if (i < accounts.length - 1) {
          await new Promise(res => setTimeout(res, 550));
        }
      }
      totalTokens = tokens.length;
      newWallet[address] = tokens;
      setWallet(newWallet);
      console.log(totalTokens);
      console.log(newWallet);
      // Show notification/toast to player
      const notifId = Date.now();
      setNotifications([{ id: notifId, content: `${totalTokens} token${totalTokens !== 1 ? 's' : ''} in this wallet!`, author: "Your Wallet", timestamp: notifId }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }, 5000);
      
      // Save wallet data to file in public/wallets/ directory
      try {
        // Format date as year-month-day-hh-mm-ss
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        
        // Create a clean version of the wallet data to save (avoid circular references)
        const walletData = {
          address,
          fetchedAt: now.toISOString(),
          date: formattedDate,
          totalTokens,
          tokens: tokens.map(token => ({
            mint: token.mint,
            balance: token.balance,
            name: token.name,
            symbol: token.symbol,
            logo: token.logo,
            tokenIsNFT: token.tokenIsNFT,
            valueStableCoin: token.valueStableCoin
          }))
        };
        
        // Use the API route to save the file on the server
        const response = await fetch('/api/save-wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address,
            walletData,
            date: formattedDate
          }),
        });
        
        if (response.ok) {
          console.log(`Wallet data saved for ${address}`);
        } else {
          console.error(`Failed to save wallet data: ${response.statusText}`);
        }
      } catch (fileError) {
        console.error("Error saving wallet data to file:", fileError);
      }
    } finally {
      setLoadingPortfolio(prev => ({ ...prev, [address]: false }));
    }
  }

  // Wallet detection and state
  const [detectedWallets, setDetectedWallets] = useState<Array<{id: string, name: string, logo: string}>>([]);

  useEffect(() => {
    const wallets = [];
    if (typeof window !== 'undefined') {
      if (window.phantom && window.phantom.solana) {
        wallets.push({ id: 'phantom', name: 'Phantom', logo: '/wallet-phantom.png' });
      }
      if (window.solflare) {
        wallets.push({ id: 'solflare', name: 'Solflare', logo: '/wallet-solflare.png' });
      }
      if (window.backpack) {
        wallets.push({ id: 'backpack', name: 'Backpack', logo: '/wallet-backpack.png' });
      }
    }
    setDetectedWallets(wallets);
  }, []);

  // Handler for wallet connect button
  async function handleWalletConnect(walletId: string) {
    let address = '';
    let response;
    try {
      if (walletId === 'phantom' && window.phantom && window.phantom.solana) {
        response = await window.phantom.solana.connect({ onlyIfTrusted: false });
        address = response.publicKey.toString();
      } else if (walletId === 'solflare' && window.solflare) {
        const isConnected = await window.solflare.connect();
        if (isConnected && window.solflare.publicKey) {
          address = window.solflare.publicKey.toString();
        } else {
          return;
        }
      } else if (walletId === 'backpack' && window.backpack) {
        response = await window.backpack.connect();
        address = response.publicKey.toString();
      } else {
        // No wallet provider found
        const notifId = Date.now();
        setNotifications((prev) => [
          ...prev,
          { id: notifId, content: 'No supported wallet provider found', author: 'System', timestamp: notifId },
        ]);
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notifId));
        }, 5000);
        return;
      }
    } catch (error) {
      console.error('Not connected :', error);
      return;
    }

    if (!address) return;
    if (addresses.includes(address)) {
      const notifId = Date.now();
      setNotifications((prev) => [
        ...prev,
        { id: notifId, content: 'Wallet already register', author: 'System', timestamp: notifId },
      ]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }, 5000);
      return;
    }
    if (addresses.length >= 3) {
      const notifId = Date.now();
      setNotifications((prev) => [
        ...prev,
        { id: notifId, content: 'You can only register 3 wallets. Disconnect one wallet before add a new.', author: 'System', timestamp: notifId },
      ]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }, 5000);
      return;
    }
    setAddresses(prev => [...prev, address]);
    console.log([...addresses, address]);
    return [...addresses, address];
  }
  const [addresses, setAddresses] = useState<string[]>([]);
  const [wallet, setWallet] = useState<{[address: string]: Array<{mint: string, balance: number}>}>({});
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const walletDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(event.target as Node)) {
        setWalletDropdownOpen(false);
      }
    }
    if (walletDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [walletDropdownOpen]);

  function disconnectWallet(addressToRemove: string) {
    setAddresses(prev => prev.filter(addr => addr !== addressToRemove));
    // Optionally, also remove from wallet state
    setWallet(prev => {
      const newWallet = { ...prev };
      delete newWallet[addressToRemove];
      return newWallet;
    });
  }
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const refContainer = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<
    Array<{ id: number; content: string; author: string; timestamp: number }>
  >([])
  const processedMessagesRef = useRef<Set<number>>(new Set())

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const rpcEndpoint = process.env.NEXT_PUBLIC_RPC_URL;
  const solanaConnection = new Connection(rpcEndpoint);
  
  // State: Map wallet address to tokens array
  const [tokenAccountsByWallet, setTokenAccountsByWallet] = useState<{ [wallet: string]: Array<{ mint: string; balance: number; name?: string | null; symbol?: string | null; logo?: string | null }> }>({});

  async function getTokenAccounts(walletAddress: string, solanaConnection: Connection) {
    const filters: GetProgramAccountsFilter[] = [
      {
        dataSize: 165, // size of account (bytes)
      },
      {
        memcmp: {
          offset: 32, // location of our query in the account (bytes)
          bytes: walletAddress, // our search criteria, a base58 encoded string
        },
      },
    ];
    const accounts = await solanaConnection.getParsedProgramAccounts(
      TOKEN_PROGRAM_ID,
      { filters: filters }
    );
    console.log(`Found ${accounts.length} token account(s) for wallet ${walletAddress}.`);

    // For each token account, get mint address and call getTokenMetadata
    // for (const account of accounts) {
    //   const parsedAccountInfo: any = account.account.data;
    //   const mintAddress: string = parsedAccountInfo["parsed"]["info"]["mint"];
    //   // Call getTokenMetadata and log the result
    //   const metadata = await getTokenMetadata(mintAddress);
    //   console.log('Token metadata:', metadata);
    // }
    // Build tokens array with metadata, with delay between calls
    const tokens: Array<{ mint: string; balance: number; name?: string | null; symbol?: string | null; logo?: string | null; tokenIsNFT?: boolean }> = [];
    for (const [i, account] of accounts.entries()) {
      // Parse the account data
      const parsedAccountInfo: any = account.account.data;
      const mintAddress: string = parsedAccountInfo["parsed"]["info"]["mint"];
      const tokenBalance: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
      const decimals: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["decimals"];
      // Get token metadata with 550ms delay
      const metadata = await getTokenMetadata(mintAddress);
      // Heuristic: NFT if decimals === 0 and balance === 1
      const tokenIsNFT = decimals === 0 && tokenBalance === 1;
      // Log results
      console.log(`Token Account No. ${i + 1}: ${account.pubkey.toString()}`);
      tokens.push({ mint: mintAddress, balance: tokenBalance, ...metadata, tokenIsNFT });
      // Wait 550ms before next call
      if (i < accounts.length - 1) {
        await new Promise(res => setTimeout(res, 550));
      }
    }
    // Store in state by wallet address
    setTokenAccountsByWallet(prev => ({ ...prev, [walletAddress]: tokens }))
    console.log("tokenAccountsByWallet")
    
    return tokens;
  }

  async function getTokenInfo(mintAddress: string) {
    // Connect to the Solana devnet (you can change to 'mainnet-beta' for mainnet)
    // const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
    // The public key of the token mint address
    const tokenMintAddress = new PublicKey(mintAddress);
  
    // Get token supply and decimals
    const tokenAccountInfo = await solanaConnection.getParsedAccountInfo(tokenMintAddress);
  
    if (tokenAccountInfo.value === null) {
      console.log('Token mint not found!');
      return;
    }
    console.log(tokenAccountInfo.value.data);
    const info = tokenAccountInfo.value?.data?.parsed?.info;
    if (!info) {
      console.log('Token info not found!');
      return;
    }
    const { mintAuthority, supply, decimals, symbol } = info;
  
    console.log(`Mint Authority: ${mintAuthority}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Supply: ${supply}`);
    console.log(`Decimals: ${decimals}`);
  }

  async function getTokenSymbol(mintAddress: string): Promise<void> {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const tokenMintAddress = new PublicKey(mintAddress);
  
    // Récupération des infos du token
    const tokenAccountInfo = await connection.getParsedAccountInfo(tokenMintAddress);
    console.log(tokenAccountInfo)
  
    if (tokenAccountInfo.value === null) {
      console.log('Token mint not found!');
      return;
    }
  
    const data = tokenAccountInfo.value.data as ParsedAccountData;
    const info = data?.parsed?.info;
    if (!info) {
      console.log('Token info not found!');
      return;
    }
    const { mintAuthority, supply, decimals } = info;
  
    console.log(`Mint Authority: ${mintAuthority}`);
    console.log(`Supply: ${supply}`);
    console.log(`Decimals: ${decimals}`);
  
    // Récupération des métadonnées du token
    const tokenListProvider = new TokenListProvider();
    const tokenList = await tokenListProvider.resolve();
    const tokenListData: TokenInfo[] = tokenList.getList();
  
    const tokenInfo = tokenListData.find(
      (token) => token.address === mintAddress
    );
  
    if (tokenInfo) {
      console.log(`Symbol: ${tokenInfo.symbol}`);
      console.log(`Logo URI: ${tokenInfo.logoURI}`);
    } else {
      console.log('Token metadata not found in the token list.');
    }
  }

  async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Refactored: returns price
// Memoized CoinGecko coins list
const [coinGeckoCoins, setCoinGeckoCoins] = useState<any[] | null>(null);

useEffect(() => {
  async function fetchCoinGeckoCoins() {
    try {
      const url = 'https://api.coingecko.com/api/v3/coins/list';
      const res = await fetch(url);
      const coins = await res.json();
      setCoinGeckoCoins(coins);
    } catch (err) {
      console.error('Failed to fetch CoinGecko coins list:', err);
      setCoinGeckoCoins([]);
    }
  }
  if (coinGeckoCoins === null) {
    fetchCoinGeckoCoins();
  }
}, [coinGeckoCoins]);

async function findCoinGeckoId(symbol: string | null | undefined): Promise<string | null> {
  if (!coinGeckoCoins) {
    // Not loaded yet
    console.log('CoinGecko coins list not loaded yet');
    return null;
  }
  if (!symbol || typeof symbol !== 'string') {
    // Invalid symbol
    console.log('Invalid symbol passed to findCoinGeckoId:', symbol);
    return null;
  }
  
  // Find the coin by matching the symbol (case-insensitive)
  const match = coinGeckoCoins.find((coin: any) => coin.symbol && coin.symbol.toLowerCase() === symbol.toLowerCase());
  
  if (!match) {
    console.log(`No CoinGecko ID found for symbol: ${symbol}`);
    return null;
  }
  
  // Return the 'id' field instead of the 'symbol' field
  // The 'id' field is what the CoinGecko API expects (e.g., "bitcoin", "solana", etc.)
  console.log(`Found CoinGecko ID for ${symbol}: ${match.id}`);
  return match.id; // Return the ID, not the symbol
}

  async function checkPortfolio() {
  if (addresses.length > 0) {
    console.log("checkPortfolio");
    console.log(addresses);
    console.log(wallet);
    
    let newWallet = { ...wallet };
    let totalTokens = 0;
    for (const address of addresses) {
      let tokenAccounts = await getTokenAccounts(address, solanaConnection);
      newWallet[address] = tokenAccounts;
      totalTokens += tokenAccounts.length;
    }
    console.log("newWallet");
    console.log(newWallet);
    setWallet(newWallet);
    console.log(newWallet);
    // Show notification/toast to player
    const notifId = Date.now();
    setNotifications([{ id: notifId, content: `${totalTokens} token${totalTokens !== 1 ? 's' : ''} in your wallet!`, author: "Your Wallet", timestamp: notifId }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    }, 5000);
  }
}

async function checkPricePortfolio(wallet: { [address: string]: Array<{ mint: string; balance: number; symbol?: string | null; price?: number | null; tokenIsNFT?: boolean }> }) {
  console.log("checkPricePortfolio");
  console.log(wallet);

  // If wallet is empty but addresses exist, auto-populate first
  if (Object.keys(wallet).length === 0 && addresses.length > 0) {
    console.log("Wallet empty, calling checkPortfolio first...");
    await checkPortfolio();
  }

  // Copy wallet to mutate
  let newWallet = { ...wallet };

  for (const address in wallet) {
    // Map over tokens to update price
    console.log("address");
    console.log(address);

    const updatedTokens = await Promise.all(
      wallet[address].map(async (token) => {
        // Skip NFTs - don't attempt to fetch price for NFTs
        if (token.tokenIsNFT) {
          console.log(`Skipping price fetch for NFT: ${token.name || token.mint}`);
          return { ...token, price: null, priceSource: "N/A - NFT", valueStableCoin: null };
        }

        const symbol = token.symbol || await getTokenSymbolReturnSymbol(token.mint);
        
        // Skip tokens with null symbol - can't fetch price without a symbol
        if (symbol === null) {
          console.log(`Skipping price fetch for token with null symbol: ${token.name || token.mint}`);
          return { ...token, price: null, priceSource: "N/A - No Symbol", valueStableCoin: null };
        }

        let price = null;
        let priceSource = "";

        // First try to get price from Binance using the token symbol
        const binancePrice = await getBinancePrice(symbol);
        if (binancePrice !== null) {
          price = binancePrice;
          priceSource = "Binance";
          console.log(`${symbol.toUpperCase()} Price (USD) from Binance: $${price}`);
        } else {
          // Second, try CoinGecko if not available on Binance
          const coinGeckoId = await findCoinGeckoId(symbol);
          if (coinGeckoId) {
            price = await fetchTokenPrice(coinGeckoId);
            priceSource = "CoinGecko";
            console.log(`${symbol.toUpperCase()} Price (USD) from CoinGecko: $${price}`);
          } else {
            // Finally, fallback to Jupiter API if not available on Binance or CoinGecko
            const jupiterPrice = await getJupiterPrice(token.mint);
            if (jupiterPrice !== null) {
              price = jupiterPrice;
              priceSource = "Jupiter";
              console.log(`${symbol.toUpperCase()} Price (USD) from Jupiter: $${price}`);
            } else {
              console.log(`No price found for ${symbol} on Binance, CoinGecko or Jupiter`);
            }
          }
        }

        // Calculate valueStableCoin (balance * price) if we have a price
        const valueStableCoin = price !== null ? token.balance * price : null;

        return { ...token, symbol, price, priceSource, valueStableCoin };
      })
    );

    newWallet[address] = updatedTokens;
  }

  setWallet(newWallet);
  
  // Count non-NFT tokens with prices for the notification
  const totalTokens = Object.values(newWallet).reduce((count, tokens) => 
    count + tokens.filter(token => token.price !== null && token.price !== undefined && !token.tokenIsNFT).length, 0);
  
  if (totalTokens > 0) {
    const notifId = Date.now();
    setNotifications([{ 
      id: notifId, 
      content: `Updated prices for ${totalTokens} token${totalTokens !== 1 ? 's' : ''}`, 
      author: "Price Oracle", 
      timestamp: notifId 
    }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    }, 5000);
  }
}

// Helper: getTokenSymbol but returns the symbol string
async function getTokenSymbolReturnSymbol(mintAddress: string): Promise<string | null> {
  const tokenMintAddress = new PublicKey(mintAddress);
  const tokenAccountInfo = await solanaConnection.getParsedAccountInfo(tokenMintAddress);
  if (tokenAccountInfo.value === null) {
    console.log('Token mint not found!');
    return null;
  }
  const data = tokenAccountInfo.value.data as ParsedAccountData;
  // Try to get symbol from token list
  const tokenListProvider = new TokenListProvider();
  const tokenList = await tokenListProvider.resolve();
  const tokenListData: TokenInfo[] = tokenList.getList();
  const tokenInfo = tokenListData.find((token) => token.address === mintAddress);
  if (tokenInfo) {
    return tokenInfo.symbol;
  } else {
    console.log('Token metadata not found in the token list.');
    return null;
  }
}

async function connectSolana() {
  // ...existing code...

  let address = '';
  let response;
  console.log("window");
  console.log(window);
  // Try Phantom
  if (window.phantom) {
    try {
      response = await window.phantom.solana.connect({ onlyIfTrusted: false });
      address = response.publicKey.toString();
    } catch (error) {
      console.error("Not connected :", error);
      return;
    }
  } else if (window.solflare) {
    try {
      const isConnected = await window.solflare.connect();
      if (isConnected && window.solflare.publicKey) {
        address = window.solflare.publicKey.toString();
      } else {
        return;
      }
    } catch (error) {
      console.error("Not connected :", error);
      return;
    }
  } else if (window.backpack) {
    try {
      response = await window.backpack.connect();
      address = response.publicKey.toString();
    } catch (error) {
      console.error("Not connected :", error);
      return;
    }
  } else {
    // No wallet provider found
    const notifId = Date.now();
    setNotifications((prev) => [
      ...prev,
      { id: notifId, content: 'No supported wallet provider found', author: 'System', timestamp: notifId },
    ]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    }, 5000);
    return;
  }

  if (!address) return;
  if (addresses.includes(address)) {
    const notifId = Date.now();
    setNotifications((prev) => [
      ...prev,
      { id: notifId, content: 'Wallet already register', author: 'System', timestamp: notifId },
    ]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    }, 5000);
    return;
  }
  if (addresses.length >= 3) {
    const notifId = Date.now();
    setNotifications((prev) => [
      ...prev,
      { id: notifId, content: 'You can only register 3 wallets. Disconnect one wallet before add a new.', author: 'System', timestamp: notifId },
    ]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    }, 5000);
    return;
  }
  setAddresses(prev => [...prev, address]);
  console.log([...addresses, address]);
  // Add a wood cube to the game when wallet connects
  addWoodCubeEntity();
  return [...addresses, address];
}

  // Handle notifications from chat messages
  useEffect(() => {
    if (!messageComponents || messageComponents.length === 0) return

    // Process new messages for notifications
    messageComponents.forEach((messageComponent, index) => {
      const messageType = messageComponent.messageType
      const messageId = messageComponent.timestamp

      // Skip if we've already processed this message
      if (processedMessagesRef.current.has(messageId)) {
        return
      }

      // Only process global notifications
      // Check if the message is a notification type
      if (
        messageType === SerializedMessageType.GLOBAL_NOTIFICATION ||
        (messageType === SerializedMessageType.TARGETED_NOTIFICATION &&
          gameInstance?.currentPlayerEntityId &&
          messageComponent.targetPlayerIds?.includes(gameInstance?.currentPlayerEntityId))
      ) {
        // Mark as processed
        processedMessagesRef.current.add(messageId)

        // Add new notification
        const newNotification = {
          id: Date.now() + index, // Unique ID
          content: messageComponent.content,
          author: messageComponent.author,
          timestamp: Date.now(),
        }

        // Only show one at a time for now
        setNotifications([newNotification])

        // Remove notification after 5 seconds
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id))
        }, 5000)
      }
    })
  }, [messageComponents, gameInstance?.currentPlayerEntityId])

  // Memoize tokenList and tokenMap for efficient lookup
  const [tokenList, setTokenList] = useState<TokenInfo[]>([]);
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());

  useEffect(() => {
    async function fetchTokenList() {
      const provider = await new TokenListProvider().resolve();
      const list = provider.filterByChainId(ENV.MainnetBeta).getList();
      setTokenList(list);
      setTokenMap(
        list.reduce((map, item) => {
          map.set(item.address, item);
          return map;
        }, new Map<string, TokenInfo>())
      );
    }
    fetchTokenList();
  }, []);

  async function getTokenMetadata(mintStrAddress: string): Promise<{ name: string | null, symbol: string | null, logo: string | null }> {
    const metaplex = Metaplex.make(solanaConnection);
  
    const mintAddress = new PublicKey(mintStrAddress);
  
    // 1. Try to get from tokenMap (fast, no network)
    const token = tokenMap.get(mintAddress.toBase58());
    if (token) {
      return {
        name: token.name || null,
        symbol: token.symbol || null,
        logo: token.logoURI || null
      };
    }
  
    // 2. Fallback: query Metaplex metadata (network request)
    const metadataAccount = metaplex.nfts().pdas().metadata({ mint: mintAddress });
  
    const metadataAccountInfo = await solanaConnection.getAccountInfo(metadataAccount);
  
    if (metadataAccountInfo) {
      console.log("found")
      const tokenMeta = await metaplex.nfts().findByMint({ mintAddress: mintAddress });
      return {
        name: tokenMeta.name || null,
        symbol: tokenMeta.symbol || null,
        logo: tokenMeta.json?.image || null
      };
    } else {
      console.log("not found")
      return { name: null, symbol: null, logo: null };
    }
  }

  // Mute state for sound
  const [isMuted, setIsMuted] = useState(false);

  // Sync mute state with MeshSystem
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[Sound Debug] GameHud setting mute state:', isMuted);
      const evt = new CustomEvent('setMuteState', { detail: isMuted });
      window.dispatchEvent(evt);
    }
  }, [isMuted]);

  const handleMuteClick = () => {
    console.log('[Sound Debug] Mute button clicked, current state:', isMuted);
    if (typeof window.stopAllSounds === 'function') {
      console.log('[Sound Debug] Calling stopAllSounds');
      window.stopAllSounds();
      setIsMuted(true);
    } else {
      console.log('[Sound Debug] No stopAllSounds function, toggling state');
      setIsMuted(m => !m);
    }
  };

  const handleUnmuteClick = () => {
    console.log('[Sound Debug] Unmute button clicked');
    setIsMuted(false);
    console.log('[Sound Debug] Set isMuted to false');
    // Optionally, add your own logic to resume sound
  };

  const handleFullscreenClick = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  return (
    <div
      id="hud"
      className="fixed inset-0 bg-gray-800 bg-opacity-0 text-white p-4 z-50 pointer-events-none"
      ref={refContainer}
    >
      <div className="fixed top-4 left-4 z-50 pointer-events-auto">
        <button
          onClick={isMuted ? handleUnmuteClick : handleMuteClick}
          className="mt-4 w-12 h-12 flex items-center justify-center rounded-full bg-white/90 hover:bg-gray-200 border border-gray-300 shadow-lg transition-all focus:outline-none"
          title={isMuted ? "Unmute All Sounds" : "Mute All Sounds"}
          style={{ boxShadow: '0 6px 24px 0 rgba(0,0,0,0.08)' }}
        >
          {isMuted ? (
            // Speaker Off Icon
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v6h4l5 5V4l-5 5H9z" />
              <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" />
            </svg>
          ) : (
            // Speaker Icon
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v6h4l5 5V4l-5 5H9z" />
            </svg>
          )}
        </button>
      </div>

      {/* Wallet Count Badge & Dropdown */}
      <div className="fixed top-4 right-4 z-50 pointer-events-auto" ref={walletDropdownRef}>
        <div
          className="bg-blue-600 text-white rounded-full px-4 py-2 shadow-lg text-sm font-semibold flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setWalletDropdownOpen(v => !v)}
        >
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
          {addresses.length} wallet{addresses.length !== 1 ? 's' : ''} connected
        </div>
        {walletDropdownOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-200 py-2 animate-fade-in z-50">
            <div className="px-4 py-2 font-semibold border-b border-gray-100 text-sm">Connected Wallets</div>
            {addresses.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-3">
                <div className="text-gray-500 text-sm mb-2">No wallets connected</div>
              </div>
            ) : (
              addresses.map(addr => (
                <div key={addr} className="flex flex-col gap-1 px-4 py-2 hover:bg-gray-100 text-xs break-all">
                  <div className="flex items-center justify-between">
                    <span className="truncate max-w-[140px]">{addr}</span>
                    <button
                      className="ml-3 text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded transition-colors text-xs border border-red-200 hover:bg-red-50"
                      onClick={e => { e.stopPropagation(); disconnectWallet(addr); }}
                    >
                      Disconnect
                    </button>
                  </div>
                  <button
                    className="mb-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1 rounded shadow transition-colors text-xs w-fit self-end disabled:bg-gray-400 disabled:cursor-not-allowed"
                    onClick={e => { e.stopPropagation(); refreshTokenPrices(addr); }}
                    disabled={!!loadingPrice[addr] || !(wallet[addr] && wallet[addr].length)}
                  >
                    {loadingPrice[addr] ? (
                      <span className="flex items-center gap-1">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        Refreshing prices...
                      </span>
                    ) : (
                      'Refresh tokens price'
                    )}
                  </button>
                  <button
                    className="mt-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1 rounded shadow transition-colors text-xs w-fit self-end disabled:bg-gray-400 disabled:cursor-not-allowed"
                    onClick={e => { e.stopPropagation(); checkPortfolioForAddress(addr); }}
                    disabled={!!loadingPortfolio[addr]}
                  >
                    Check Portfolio
                  </button>
                  {loadingPortfolio[addr] && (
                    <div className="flex items-center gap-2 mt-1 self-end">
                      <svg className="animate-spin h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      <span className="text-xs text-green-700">Loading...</span>
                      <span className="text-xs text-green-800 font-bold">{liveTokenCount[addr] ?? 0} Token{liveTokenCount[addr] === 1 ? '' : 's'} found</span>
                    </div>
                  )}
                </div>
              ))
            )}
            {/* Always show add wallet button at the bottom */}
            <div className="flex flex-col items-center px-4 py-3 border-t border-gray-200 mt-2">
              {/* Render a button for each detected wallet provider */}
              {detectedWallets.length === 0 ? (
                <button
                  className="bg-gray-400 text-white font-semibold px-4 py-2 rounded shadow text-sm w-full cursor-not-allowed"
                  disabled
                >
                  No supported wallet provider found
                </button>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  {detectedWallets.map((wallet) => (
                    <button
                      key={wallet.id}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow transition-colors text-sm w-full"
                      onClick={e => { e.stopPropagation(); handleWalletConnect(wallet.id); }}
                    >
                      <img src={wallet.logo} alt={wallet.name + ' logo'} className="w-6 h-6" />
                      Connect with {wallet.name}
                    </button>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
      {/* Global Notifications */}
      <div className="fixed top-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-2 pointer-events-none">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-black/60 text-white w-full max-w-sm p-3 rounded-lg shadow-xl text-center transition-opacity duration-500"
            style={{
              animation: 'bounceIn 0.4s ease-out, fadeOut 0.6s ease 4s forwards',
              transformOrigin: 'top center',
            }}
          >
            <div className="flex flex-col items-center">
              <p className="font-semibold font-sans text-yellow-400 text-lg sm:text-xl">
                {notification.author}
              </p>
              <p className="text-white text-base sm:text-lg">{notification.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <div className="shadow-4xl p-4 rounded-lg space-y-1 bg-gray-800 bg-opacity-20">
          <p className="text-sm">👋 Welcome to </p>
          <a
            className="text-sm md:text-2xl font-bold pointer-events-auto hover:text-gray-400"
            href="/"
          >
            TradingLand
          </a>
          <div className="text-sm flex justify-center text-white pointer-events-auto">
            <Link
              href="https://discord.gg/kPhgtj49U2"
              target="_blank"
              className="flex items-center justify-center mt-2 gap-2 px-3 py-1 w-full bg-transparent border border-b-2 hover:bg-blue-900/30 rounded-md transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 512"
                className="h-5 w-5 text-white fill-white"
              >
                <path d="M524.5 69.8a1.5 1.5 0 0 0 -.8-.7A485.1 485.1 0 0 0 404.1 32a1.8 1.8 0 0 0 -1.9 .9 337.5 337.5 0 0 0 -14.9 30.6 447.8 447.8 0 0 0 -134.4 0 309.5 309.5 0 0 0 -15.1-30.6 1.9 1.9 0 0 0 -1.9-.9A483.7 483.7 0 0 0 116.1 69.1a1.7 1.7 0 0 0 -.8 .7C39.1 183.7 18.2 294.7 28.4 404.4a2 2 0 0 0 .8 1.4A487.7 487.7 0 0 0 176 479.9a1.9 1.9 0 0 0 2.1-.7A348.2 348.2 0 0 0 208.1 430.4a1.9 1.9 0 0 0 -1-2.6 321.2 321.2 0 0 1 -45.9-21.9 1.9 1.9 0 0 1 -.2-3.1c3.1-2.3 6.2-4.7 9.1-7.1a1.8 1.8 0 0 1 1.9-.3c96.2 43.9 200.4 43.9 295.5 0a1.8 1.8 0 0 1 1.9 .2c2.9 2.4 6 4.9 9.1 7.2a1.9 1.9 0 0 1 -.2 3.1 301.4 301.4 0 0 1 -45.9 21.8 1.9 1.9 0 0 0 -1 2.6 391.1 391.1 0 0 0 30 48.8 1.9 1.9 0 0 0 2.1 .7A486 486 0 0 0 610.7 405.7a1.9 1.9 0 0 0 .8-1.4C623.7 277.6 590.9 167.5 524.5 69.8zM222.5 337.6c-29 0-52.8-26.6-52.8-59.2S193.1 219.1 222.5 219.1c29.7 0 53.3 26.8 52.8 59.2C275.3 311 251.9 337.6 222.5 337.6zm195.4 0c-29 0-52.8-26.6-52.8-59.2S388.4 219.1 417.9 219.1c29.7 0 53.3 26.8 52.8 59.2C470.7 311 447.5 337.6 417.9 337.6z" />
              </svg>
              <span className="font-medium">Join Discord</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div className="mt-5 shadow-4xl p-4 rounded-lg bg-gray-800 bg-opacity-20" onClick={() => {connectSolana();}}>
          <div className="text-sm flex justify-center text-white pointer-events-auto">
              <span className="font-medium">Connect Wallet</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="mt-5 shadow-4xl p-4 rounded-lg bg-gray-800 bg-opacity-20" onClick={() => {checkPortfolio();}}>
          <div className="text-sm flex justify-center text-white pointer-events-auto">
              <span className="font-medium">Check Portfolio</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="mt-5 shadow-4xl p-4 rounded-lg bg-gray-800 bg-opacity-20" onClick={() => {checkPricePortfolio(wallet);}}>
          <div className="text-sm flex justify-center text-white pointer-events-auto">
              <span className="font-medium">Check Portfolio Price</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="mt-5 shadow-4xl p-4 rounded-lg bg-gray-800 bg-opacity-20" onClick={() => {getTokenMetadata("3SghkPdBSrpF9bzdAy5LwR4nGgFbqNcC6ZSq8vtZdj91");}}>
          <div className="text-sm flex justify-center text-white pointer-events-auto">
              <span className="font-medium">Check Metadata</span>
          </div>
        </div>
      </div>

      <div className="flex lg:hidden pointer-events-auto">
        <div className="absolute top-2 right-2">
          <button onClick={handleFullscreenClick} className="text-white hover:text-gray-300">
            <Maximize className="size-16" />
          </button>
        </div>
        <div className="absolute bottom-12 left-12">
          <Joystick
            size={100}
            baseColor="rgba(255, 255, 255, 0.5)"
            stickColor="rgba(255, 255, 255, 0.2)"
            move={(props) => gameInstance?.inputManager.handleJoystickMove(props)}
            stop={(props) => gameInstance?.inputManager.handleJoystickStop(props)}
          />
        </div>
        <div className="absolute bottom-12 right-12">
          <button
            className="bg-gray-500 bg-opacity-20 text-white font-bold py-4 px-8 rounded-full shadow-lg transition-transform transform hover:bg-gray-600 hover:bg-opacity-100 focus:bg-green-600 focus:bg-opacity-100 focus:outline-none active:translate-y-1 w-24 h-24 flex items-center justify-center"
            onTouchStart={() => gameInstance && (gameInstance.inputManager.inputState.s = true)}
            onMouseDown={() => gameInstance && (gameInstance.inputManager.inputState.s = true)}
            onTouchEnd={() => gameInstance && (gameInstance.inputManager.inputState.s = false)}
            onMouseOut={() => gameInstance && (gameInstance.inputManager.inputState.s = false)}
          >
            <span className="pointer-events-none">Jump</span>
          </button>
        </div>
      </div>
    </div>
  )
}
