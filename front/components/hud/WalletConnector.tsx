import { useState, useEffect, useRef } from 'react';
import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenAccounts, getTokenMetadata } from './utils/TokenUtils';
import { getBinancePrice, getJupiterPrice, findCoinGeckoId, fetchTokenPrice, fetchCoinGeckoCoins } from './utils/PriceUtils';
import { sleep, getTokenSymbolReturnSymbol } from './utils/TokenUtils';

// Extend the Window interface to include wallet providers
declare global {
  interface Window {
    phantom?: any;
    solflare?: any;
    backpack?: any;
  }
}

// Also fetch portfolio data using the API with this address
interface CustomWindow extends Window {
  fetchWalletPortfolio?: (address?: string) => Promise<void>;
}

type WalletInfo = {
  id: string;
  name: string;
  logo: string;
};

type TokenInfo = {
  mint: string;
  balance: number;
  name?: string | null;
  symbol?: string | null;
  logo?: string | null;
  tokenIsNFT?: boolean;
  valueStableCoin?: number | null;
  price?: number | null;
  priceSource?: string;
};

type WalletState = {
  [address: string]: TokenInfo[];
};

type NotificationType = {
  id: number;
  content: string;
  author: string;
  timestamp: number;
};

interface WalletConnectorProps {
  onAddressesChange: (addresses: string[]) => void;
  onWalletChange: (wallet: WalletState) => void;
  setNotifications: (notificationsFn: (prev: NotificationType[]) => NotificationType[]) => void;
}

// Compteur global pour générer des identifiants uniques
let notificationIdCounter = 0;

// Fonction utilitaire pour générer un identifiant unique pour les notifications
const generateUniqueNotificationId = (): number => {
  // Utiliser Date.now() comme base et ajouter un compteur incrémentiel
  return Date.now() + (++notificationIdCounter);
};

export function WalletConnector({ onAddressesChange, onWalletChange, setNotifications }: WalletConnectorProps) {
  // Wallet detection and state
  const [detectedWallets, setDetectedWallets] = useState<WalletInfo[]>([]);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [wallet, setWallet] = useState<WalletState>({});
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const walletDropdownRef = useRef<HTMLDivElement>(null);
  
  // Loading states
  const [loadingPortfolio, setLoadingPortfolio] = useState<{[address: string]: boolean}>({});
  const [liveTokenCount, setLiveTokenCount] = useState<{[address: string]: number}>({});
  const [tokenPrices, setTokenPrices] = useState<{[mint: string]: number | null}>({});
  const [loadingPrice, setLoadingPrice] = useState<{[address: string]: boolean}>({});
  
  // Track last CoinGecko API call time to implement rate limiting
  const [lastCoinGeckoCall, setLastCoinGeckoCall] = useState<number>(0);
  
  // Memoized CoinGecko coins list
  const [coinGeckoCoins, setCoinGeckoCoins] = useState<any[] | null>(null);
  
  const rpcEndpoint = process.env.NEXT_PUBLIC_RPC_URL;
  const solanaConnection = new Connection(rpcEndpoint);

  // Detect available wallets
  useEffect(() => {
    const detectWallets = () => {
      const availableWallets = [];
      
      if (window.phantom?.solana) {
        availableWallets.push({
          id: 'phantom',
          name: 'Phantom',
          logo: '/assets/wallets/wallet-phantom.png'
        });
      }
      
      if (window.solflare) {
        availableWallets.push({
          id: 'solflare',
          name: 'Solflare',
          logo: '/assets/wallets/wallet-solflare.png'
        });
      }
      
      if (window.backpack) {
        availableWallets.push({
          id: 'backpack',
          name: 'Backpack',
          logo: '/assets/wallets/wallet-backpack.png'
        });
      }
      
      setDetectedWallets(availableWallets);
    };
    
    // Detect wallets on initial load
    detectWallets();
    
    // Also set up an interval to periodically check for new wallets
    const intervalId = setInterval(detectWallets, 3000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Handle wallet connect button
  const handleWalletConnect = async (walletId: string) => {
    try {
      let provider;
      let walletAddress = '';
      
      switch (walletId) {
        case 'phantom':
          provider = window.phantom?.solana;
          break;
        case 'solflare':
          provider = window.solflare;
          break;
        case 'backpack':
          provider = window.backpack;
          break;
        default:
          throw new Error(`Unsupported wallet: ${walletId}`);
      }
      console.log("provider", provider);
      if (!provider) {
        throw new Error(`${walletId} wallet not found`);
      }
      
      // Request connection to the wallet
      if (walletId === 'solflare') {
        // Handle Solflare connection differently
        const isConnected = await provider.connect();
        console.log("Solflare connected:", isConnected);
        console.log("Solflare provider:", provider);
        
        if (isConnected && provider.publicKey) {
          walletAddress = provider.publicKey.toString();
          console.log("Solflare wallet address:", walletAddress);
        } else {
          throw new Error('Failed to connect to Solflare wallet');
        }
      } else {
        // Handle Phantom and Backpack
        const resp = await provider.connect();
        console.log("Response:", resp);
        console.log("Provider:", provider);
        
        if (resp && resp.publicKey) {
          console.log("Public key:", resp.publicKey);
          walletAddress = resp.publicKey.toString();
        } else {
          throw new Error(`Failed to get public key from ${walletId} wallet`);
        }
      }
      
      // Check if this wallet is already connected
      if (addresses.includes(walletAddress)) {
        console.log(`Wallet ${walletAddress} already connected`);
        return;
      }
      
      // Add the new address to our list of connected addresses
      const newAddresses = [...addresses, walletAddress];
      setAddresses(newAddresses);
      onAddressesChange(newAddresses);
      
      // Show notification
      const notifId = Date.now();
      setNotifications(prev => [...prev, { 
        id: notifId, 
        content: `Connected ${walletId} wallet`, 
        author: "Wallet", 
        timestamp: notifId 
      }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
      }, 5000);
      
      // Initialize wallet data structure for this address
      setWallet(prev => ({ ...prev, [walletAddress]: [] }));
      
      // Fetch portfolio for this address
      checkPortfolioForAddress(walletAddress);
      
      // If this is the first wallet connected, also fetch portfolio data from API
      if (newAddresses.length === 1) {
        const customWindow = window as CustomWindow;
        // Use optional chaining to safely call the function if it exists
        customWindow.fetchWalletPortfolio?.(walletAddress);
      }
    } catch (error) {
      console.error(`Error connecting to ${walletId} wallet:`, error);
      
      // Show error notification
      const notifId = generateUniqueNotificationId();
      const now = Date.now();
      setNotifications(prev => [...prev, { 
        id: notifId, 
        content: `Failed to connect ${walletId} wallet: ${error.message}`, 
        author: "Wallet", 
        timestamp: now 
      }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
      }, 5000);
    }
  };

  // Handle click outside wallet dropdown
  const handleClickOutside = (event: MouseEvent) => {
    // Vérifier si l'élément cliqué est le bouton de wallet
    const isWalletButton = (event.target as Element).closest('.wallet-button');
    
    // Ne fermer le dropdown que si le clic est à l'extérieur du dropdown ET n'est pas sur le bouton de wallet
    if (walletDropdownRef.current && 
        !walletDropdownRef.current.contains(event.target as Node) && 
        !isWalletButton) {
      setWalletDropdownOpen(false);
    }
  };

  // Add/remove event listener for clicks outside dropdown
  useEffect(() => {
    if (walletDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [walletDropdownOpen]);

  // Disconnect wallet
  const disconnectWallet = (addressToRemove: string) => {
    // Remove the address from our list
    const newAddresses = addresses.filter(addr => addr !== addressToRemove);
    setAddresses(newAddresses);
    onAddressesChange(newAddresses);
    
    // Remove the wallet data
    setWallet(prev => {
      const newWallet = { ...prev };
      delete newWallet[addressToRemove];
      return newWallet;
    });
    onWalletChange(wallet);
  };

  /**
   * Sauvegarde les données du portefeuille dans un fichier JSON sur le serveur
   * @param address Adresse du portefeuille
   * @param walletData Données du portefeuille à sauvegarder
   */
  const saveWalletDataToJson = async (address: string, walletData: TokenInfo[]) => {
    try {
      // Créer un objet avec les données du portefeuille et des métadonnées
      const dataToSave = {
        address,
        lastUpdated: new Date().toISOString(),
        tokens: walletData,
        totalTokens: walletData.length,
      };
      
      // Générer un timestamp pour le nom du fichier
      const dateNow = Date.now();
      
      // Envoyer les données à l'API pour les sauvegarder dans un fichier
      const response = await fetch('/api/save-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          walletData: dataToSave,
          date: dateNow
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`Wallet data for ${address} saved to ${result.path}`);
        
        // Notification de sauvegarde réussie
        const notifId = generateUniqueNotificationId();
        const now = Date.now();
        setNotifications(prev => [...prev, { 
          id: notifId, 
          content: `Données du portefeuille sauvegardées dans ${result.path}`, 
          author: "Wallet", 
          timestamp: now 
        }]);
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notifId));
        }, 5000);
      } else {
        throw new Error(result.error || 'Failed to save wallet data');
      }
    } catch (error) {
      console.error(`Error saving wallet data for ${address}:`, error);
      
      // Notification d'erreur
      const errorNotifId = generateUniqueNotificationId();
      const errorNow = Date.now();
      setNotifications(prev => [...prev, { 
        id: errorNotifId, 
        content: `Erreur lors de la sauvegarde des données: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 
        author: "Wallet", 
        timestamp: errorNow 
      }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== errorNotifId));
      }, 5000);
    }
  };
  
  // Check portfolio for a single address
  const checkPortfolioForAddress = async (address: string) => {
    try {
      setLoadingPortfolio(prev => ({ ...prev, [address]: true }));
      
      // Fetch token accounts for this address
      const tokenAccounts = await getTokenAccounts(address, solanaConnection);
      console.log(`Found ${tokenAccounts.length} token accounts for ${address}`);
      
      // Initialize wallet data for this address if it doesn't exist
      if (!wallet[address]) {
        setWallet(prev => ({ ...prev, [address]: [] }));
      }
      
      // Process each token account
      let liveTokens = 0;
      let stop = 2;
      for (const token of tokenAccounts) {
        if (stop-- <= 0) break;
        // Skip tokens with zero balance
        if (token.balance <= 0) continue;
        
        liveTokens++;
        
        // Check if we already have this token in our wallet
        const existingTokenIndex = wallet[address]?.findIndex(t => t.mint === token.mint);
        
        if (existingTokenIndex !== -1 && existingTokenIndex !== undefined) {
          // Update existing token
          setWallet(prev => {
            const newWallet = { ...prev };
            newWallet[address][existingTokenIndex].balance = token.balance;
            return newWallet;
          });
        } else {
          // Add new token
          try {
            // Get token metadata
            const metadata = await getTokenMetadata(token.mint, token.balance);
            
            // Determine if token is an NFT (balance is 1 and no decimals)
            const tokenIsNFT = token.balance === 1;
            
            // Add token to wallet
            setWallet(prev => {
              const newWallet = { ...prev };
              if (!newWallet[address]) {
                newWallet[address] = [];
              }
              newWallet[address].push({
                ...token,
                ...metadata,
                tokenIsNFT
              });
              console.log("New wallet data for", address, newWallet[address]);
              console.log("New wallet data for", address, wallet);
              return newWallet;
            });
          } catch (error) {
            console.error(`Error processing token ${token.mint}:`, error);
          }
        }
        
        // Throttle requests to avoid rate limiting
        await sleep(100);
      }
      
      // Mise à jour du nombre de tokens actifs
      setLiveTokenCount(prev => ({ ...prev, [address]: liveTokens }));
      
      // Mettre à jour le portefeuille et sauvegarder les données dans un même callback
      // pour s'assurer que nous utilisons les données les plus récentes
      setWallet(prev => {
        const updatedWallet = { ...prev };
        
        // S'assurer que l'adresse existe dans le portefeuille
        if (updatedWallet[address] && updatedWallet[address].length > 0) {
          console.log("Wallet data inside setState callback:", updatedWallet[address]);
          
          // Sauvegarder les données du portefeuille dans un fichier JSON
          // en utilisant les données mises à jour
          saveWalletDataToJson(address, updatedWallet[address])
            .catch(error => console.error(`Error saving wallet data for ${address}:`, error));
        }
        
        // Mettre à jour le composant parent avec le nouvel état du portefeuille
        onWalletChange(updatedWallet);
        
        return updatedWallet;
      });
      
      // Rafraîchir les prix des tokens
      // Note: Cette fonction doit être appelée après la mise à jour du portefeuille
      refreshTokenPrices(address);
      
      // Show notification
      const notifId = generateUniqueNotificationId();
      const now = Date.now();
      setNotifications(prev => [...prev, { 
        id: notifId, 
        content: `Found ${liveTokens} tokens in wallet`, 
        author: "Portfolio", 
        timestamp: now 
      }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
      }, 5000);
    } catch (error) {
      console.error(`Error checking portfolio for ${address}:`, error);
      
      // Show error notification
      const notifId = generateUniqueNotificationId();
      const now = Date.now();
      setNotifications(prev => [...prev, { 
        id: notifId, 
        content: `Failed to load portfolio: ${error.message}`, 
        author: "Portfolio", 
        timestamp: now 
      }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
      }, 5000);
    } finally {
      setLoadingPortfolio(prev => ({ ...prev, [address]: false }));
    }
  };

  // Refresh all token prices for a wallet
  const refreshTokenPrices = async (address: string) => {
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
        const coinGeckoId = await findCoinGeckoId(symbol, coinGeckoCoins);
        if (coinGeckoId) {
          await sleep(500); // 500ms delay between requests to avoid rate limiting
          price = await fetchTokenPrice(coinGeckoId, lastCoinGeckoCall, setLastCoinGeckoCall);
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
      
      // Afficher les données mises à jour du portefeuille
      console.log("Updated wallet inside setState callback:", updatedWallet[address]);
      
      // Mettre à jour le composant parent avec le nouvel état du portefeuille
      // Utiliser updatedWallet au lieu de wallet pour avoir les données à jour
      onWalletChange(updatedWallet);
      
      return updatedWallet;
    });
    
    // Ce log affichera l'ancienne valeur de wallet car setWallet est asynchrone
    console.log("Updated wallet (old value due to async setState):", wallet);
    
    // Store the prices in the tokenPrices state as well (for backward compatibility)
    setTokenPrices(prev => ({ ...prev, ...newPrices }));
    
    // Notification que le portefeuille a été mis à jour avec succès
    const now = Date.now();
    const walletUpdateNotifId = generateUniqueNotificationId();
    setNotifications(prev => [...prev, { 
      id: walletUpdateNotifId, 
      content: `Portefeuille mis à jour avec succès`, 
      author: "Wallet", 
      timestamp: now 
    }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== walletUpdateNotifId));
    }, 5000);
    
    // Count non-NFT tokens with prices for the notification
    const tokensWithPrice = Object.entries(newPrices)
      .filter(([mint, price]) => {
        const token = wallet[address].find(t => t.mint === mint);
        return price !== null && !token?.tokenIsNFT;
      }).length;
    
    if (tokensWithPrice > 0) {
      const now = Date.now();
      const notifId = generateUniqueNotificationId();
      setNotifications(prev => [...prev, { 
        id: notifId, 
        content: `Updated prices for ${tokensWithPrice} token${tokensWithPrice !== 1 ? 's' : ''}`, 
        author: "Price Oracle", 
        timestamp: now 
      }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter((n) => n.id !== notifId));
      }, 5000);
    }
    
    setLoadingPrice(prev => ({ ...prev, [address]: false }));
  };

  // Check portfolio for all connected addresses
  const checkPortfolio = async () => {
    try {
      for (const address of addresses) {
        await checkPortfolioForAddress(address);
      }
      
      // Notification que la vérification du portefeuille est terminée
      const portfolioCheckNotifId = generateUniqueNotificationId();
      setNotifications(prev => [...prev, { 
        id: portfolioCheckNotifId, 
        content: `Vérification du portefeuille terminée`, 
        author: "Portfolio", 
        timestamp: portfolioCheckNotifId 
      }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== portfolioCheckNotifId));
      }, 5000);
    } catch (error: any) {
      console.error('Error checking portfolio for all addresses:', error);
      
      // Notification d'erreur
      const errorNotifId = generateUniqueNotificationId();
      setNotifications(prev => [...prev, { 
        id: errorNotifId, 
        content: `Erreur lors de la vérification du portefeuille: ${error?.message || 'Erreur inconnue'}`, 
        author: "Portfolio", 
        timestamp: errorNotifId 
      }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== errorNotifId));
      }, 5000);
    }
  };

  // Fetch CoinGecko coins list on component mount
  useEffect(() => {
    const initCoinGeckoCoins = async () => {
      if (coinGeckoCoins === null) {
        const coins = await fetchCoinGeckoCoins();
        setCoinGeckoCoins(coins);
      }
    };
    
    initCoinGeckoCoins();
  }, [coinGeckoCoins]);

  return {
    detectedWallets,
    addresses,
    wallet,
    walletDropdownOpen,
    walletDropdownRef,
    loadingPortfolio,
    loadingPrice,
    liveTokenCount,
    handleWalletConnect,
    disconnectWallet,
    checkPortfolio,
    refreshTokenPrices,
    setWalletDropdownOpen
  };
}
