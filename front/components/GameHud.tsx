/* eslint-disable react/jsx-no-undef */
import { useEffect, useRef, useState } from 'react'
import { Joystick } from 'react-joystick-component'
import { Game } from '@/game/Game'
import Link from 'next/link'
import { SerializedMessageType } from '@shared/network/server/serialized'
import { MessageComponent } from '@shared/component/MessageComponent'
import { Maximize } from 'lucide-react'
import { MicroGameCard } from './GameCard'
import { GameInfo } from '@/types'
import gameData from '../public/gameData.json'
import { createSolanaClient, GetTokenAccountBalanceApi } from "gill";
import { address } from "@solana/kit";
import { Connection, GetProgramAccountsFilter, PublicKey, clusterApiUrl, ParsedAccountData } from "@solana/web3.js";
import { TokenListProvider, TokenInfo } from '@solana/spl-token-registry';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Metaplex } from '@metaplex-foundation/js';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import {
  Metadata,
  findMetadataPda,
} from '@metaplex-foundation/mpl-token-metadata';;
import axios from 'axios';

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
  const [addresses, setAddresses] = useState<string[]>([]);
  const [wallet, setWallet] = useState<{[address: string]: Array<{mint: string, balance: number}>}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const refContainer = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<
    Array<{ id: number; content: string; author: string; timestamp: number }>
  >([])
  const processedMessagesRef = useRef<Set<number>>(new Set())

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }


  console.log("here")
  async function callSol() {
    console.log("here2")
    const { rpc } = createSolanaClient({ urlOrMoniker: "devnet" });
    
    // get slot
    const slot = await rpc.getSlot().send();
    
    // get the latest blockhash
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    console.log(latestBlockhash)
    const { value: account } = await rpc.getAccountInfo(address("GthTyfd3EV9Y8wN6zhZeES5PgT2jQVzLrZizfZquAY5S")).send();
    console.log("account")
    console.log(account)

    // if (typeof window.solana !== 'undefined') {
    //   console.log("solana in da place")
    //   const provider = window.solana;
    //   console.log(provider)
    //   if (provider.isPhantom) {
    //     console.log("Phantom ok");
    //     const response = await window.phantom.solana.connect({ onlyIfTrusted: true });
    //     console.log("Connected to wallet:", response.publicKey.toString());
    //   }
    // }

  }
  callSol()
  console.log("process.env.NEXT_PUBLIC_RPC_URL")
  console.log(process.env.NEXT_PUBLIC_RPC_URL)
  const rpcEndpoint = process.env.NEXT_PUBLIC_RPC_URL;
  const solanaConnection = new Connection(rpcEndpoint);
  
  const walletToQuery = 'GthTyfd3EV9Y8wN6zhZeES5PgT2jQVzLrZizfZquAY5S'; //example: vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg
  
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
  const tokens: Array<{ mint: string; balance: number }> = [];
  for (const [i, account] of accounts.entries()) {
    // Parse the account data
    const parsedAccountInfo: any = account.account.data;
    const mintAddress: string = parsedAccountInfo["parsed"]["info"]["mint"];
    const tokenBalance: number = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
    // Log results
    console.log(`Token Account No. ${i + 1}: ${account.pubkey.toString()}`);
    console.log(`--Token Mint: ${mintAddress}`);
    console.log(`--Token Balance: ${tokenBalance}`);
    // Fetch and log token symbol and logo
    await getTokenSymbol(mintAddress);
    tokens.push({ mint: mintAddress, balance: tokenBalance });
  }
  return tokens;
}
  // getTokenAccounts(walletToQuery,solanaConnection);



  // const NEXT_PUBLIC_SOLSCAN_API_KEY = 'YOUR_API_KEY';
  const mintAddress = 'DFL1zNkaGPWm1BqAVqRjCZvHmwTFrEaJtbzJWgseoNJh';

  // async function getTokenInfoPrice(address: string) {
  //   try {
 
  //     // Step 2: Call CoinGecko to get token price (requires mapping symbol to a CoinGecko ID)
  //     const marketRes = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
  //       params: {
  //         ids: 'defi-land', // CoinGecko ID for DFL
  //         vs_currencies: 'usd',
  //       },
  //     });
  
  //     const price = marketRes.data['defi-land'].usd;
  //     console.log(`Price: $${price}`);
  //   } catch (error) {
  //     console.error('Error fetching token info:', error);
  //   }
  // }
  // getTokenInfoPrice(TOKEN_ADDRESS);

  // const metaplex = new Metaplex(solanaConnection);
  // const mint = new PublicKey('DFL1zNkaGPWm1BqAVqRjCZvHmwTFrEaJtbzJWgseoNJh');

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
    const { mintAuthority, supply, decimals, symbol } = tokenAccountInfo.value.data.parsed.info;
  
    console.log(`Mint Authority: ${mintAuthority}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Supply: ${supply}`);
    console.log(`Decimals: ${decimals}`);
  }

  // async function getTokenInfo() {
  //   const mint = new PublicKey(TOKEN_ADDRESS);
  
  //   // Step 1: Get decimals and supply
  //   const mintInfo = await connection.getParsedAccountInfo(mint);
  //   if (!mintInfo.value) {
  //     console.log('Token mint not found!');
  //     return;
  //   }
  
  //   const parsed = (mintInfo.value.data as any).parsed.info;
  //   console.log(`Decimals: ${parsed.decimals}`);
  //   console.log(`Supply: ${parsed.supply}`);
  //   console.log(`Mint Authority: ${parsed.mintAuthority}`);
  
  //   // Step 2: Get symbol and name from metadata
  //   try {
  //     const metadataPDA = findMetadataPda(mint);
  //     const metadata = await Metadata.fromAccountAddress(connection, metadataPDA);
  //     console.log(`Symbol: ${metadata.data.symbol.trim()}`);
  //     console.log(`Name: ${metadata.data.name.trim()}`);
  //     console.log(`URI: ${metadata.data.uri.trim()}`);
  //   } catch (e) {
  //     console.error('Token metadata not found via Metaplex:', e.message);
  //   }
  // }

  getTokenInfo('DFL1zNkaGPWm1BqAVqRjCZvHmwTFrEaJtbzJWgseoNJh')

  // async function fetchTokenMetadata() {
  //   try {
  //     const metadataPda = findMetadataPda(mint);
  //     const metadata = await Metadata.fromAccountAddress(solanaConnection, metadataPda);
  
  //     console.log('Name:', metadata.data.name.trim());
  //     console.log('Symbol:', metadata.data.symbol.trim());
  //     console.log('URI:', metadata.data.uri.trim());
  //   } catch (error) {
  //     console.error('Failed to fetch token metadata:', error);
  //   }
  // }
  
  // fetchTokenMetadata();

  // async function getMetadata() {
  //   try {
  //     const nft = await metaplex.nfts().findByMint({ mintAddress: mint });
  //     console.log('Name:', nft.name);
  //     console.log('Symbol:', nft.symbol);
  //     console.log('URI:', nft.uri); // points to metadata JSON
  //   } catch (e) {
  //     console.error('Error fetching metadata:', e);
  //   }
  // }
  // getMetadata();
  // async function getFungibleTokenMetadata() {
  //   try {
  //     const metadataPDA = await Metadata.getPDA(mint);
  //     const metadataAccount = await Metadata.load(solanaConnection, metadataPDA);
  //     const { data } = metadataAccount.data;
  
  //     console.log('Name:', data.name);
  //     console.log('Symbol:', data.symbol);
  //     console.log('URI:', data.uri); // can contain logo, decimals, etc.
  //   } catch (e) {
  //     console.error('Metadata not found:', e);
  //   }
  // }
  // getFungibleTokenMetadata();
  // const TOKEN_MINT_ADDRESS = 'DFL1zNkaGPWm1BqAVqRjCZvHmwTFrEaJtbzJWgseoNJh';
  async function getTokenSymbol(mintAddress: string): Promise<void> {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const tokenMintAddress = new PublicKey(mintAddress);
  
    // Récupération des infos du token
    const tokenAccountInfo = await connection.getParsedAccountInfo(tokenMintAddress);
  
    if (tokenAccountInfo.value === null) {
      console.log('Token mint not found!');
      return;
    }
  
    const data = tokenAccountInfo.value.data as ParsedAccountData;
    const { mintAuthority, supply, decimals } = data.parsed.info;
  
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
  getTokenSymbol(mintAddress)

  async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Refactored: returns price
async function findCoinGeckoId(symbol: string): Promise<number | null> {
  const url = 'https://api.coingecko.com/api/v3/coins/list';
  try {
    const res = await fetch(url);
    const coins = await res.json();
    const match = coins.find((coin: any) => coin.symbol.toLowerCase() === symbol.toLowerCase());
    if (!match) {
      console.log(`No CoinGecko ID found for symbol: ${symbol}`);
      return null;
    }
    console.log(`Found CoinGecko ID: ${match.id}`);
    // Fetch price
    const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${match.id}&vs_currencies=usd`);
    const priceData = await priceRes.json();
    const price = priceData[match.id]?.usd ?? null;
    console.log(`${symbol.toUpperCase()} Price (USD):`, price);
    await sleep(500);
    return price;
  } catch (err) {
    console.error('Error:', err);
    return null;
  }
}
  
  // findCoinGeckoId('DFL');

  async function checkPortfolio() {
  if (addresses.length > 0) {
    let newWallet = { ...wallet };
    for (const address of addresses) {
      let tokenAccounts = await getTokenAccounts(address, solanaConnection);
      newWallet[address] = tokenAccounts;
    }
    setWallet(newWallet);
    console.log(newWallet);
  }
}

async function checkPricePortfolio() {
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
    const updatedTokens = await Promise.all(wallet[address].map(async (token) => {
      const symbol = await getTokenSymbolReturnSymbol(token.mint);
      let price = null;
      if (symbol) {
        price = await findCoinGeckoId(symbol);
        // Display in UI (for now, alert, but you can use a state for better UI)
        if (price !== null) {
          console.log(`${symbol.toUpperCase()} Price (USD): $${price}`);
        }
      }
      return { ...token, symbol, price };
    }));
    newWallet[address] = updatedTokens;
  }
  setWallet(newWallet);
}

// Helper: getTokenSymbol but returns the symbol string
async function getTokenSymbolReturnSymbol(mintAddress: string): Promise<string | null> {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const tokenMintAddress = new PublicKey(mintAddress);
  const tokenAccountInfo = await connection.getParsedAccountInfo(tokenMintAddress);
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
    let address= '';
    let newAddresses = [...addresses];
    if (window.phantom) {
        console.log("Le wallet phantom est installé.");
        try {
            const response = await window.phantom.solana.connect({ onlyIfTrusted: false });
            console.log("Connected to wallet:", response.publicKey.toString());
            address = response.publicKey.toString();
            if (!newAddresses.includes(address)) {
              newAddresses.push(address);
            }
        } catch (error) {
          console.error("Not connected :", error);
        }
    }
    if (window.solflare) {
        console.log("Le wallet Solflare est installé.");
        try {
            let isConnected = await window.solflare.connect();
            if (isConnected){
                response = window.solflare;
                console.log("Connected to wallet:", response.publicKey.toString());
                if (!newAddresses.includes(address)) {
                  newAddresses.push(address);
                }
            }
        } catch (error) {
          console.error("Not connected :", error);
        }
    }
    if (window.backpack) {
        console.log("Le wallet backpack est installé.");
        try {
            const response = await window.backpack.connect();
            address = response.publicKey.toString();
            console.log("Connected to wallet:", address);
            if (!addresses.includes(address)) {
              addresses.push(address);
            }
        } catch (error) {
          console.error("Not connected :", error);
        }
    }
    setAddresses(newAddresses);
    console.log(newAddresses)
    return newAddresses;
  }

  useEffect(() => {
    scrollToBottom()
  }, [messageComponents])

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

  const handleFullscreenClick = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  // Filter messages based on type and target
  const getFilteredMessages = () => {
    if (!messageComponents || messageComponents.length === 0) return []

    return messageComponents.filter((message) => {
      const messageType = message.messageType
      const targetPlayerIds = message.targetPlayerIds || []
      // Show global chat messages
      if (messageType === SerializedMessageType.GLOBAL_CHAT) return true

      // Show targeted chat messages if player is in target list
      if (
        messageType === SerializedMessageType.TARGETED_CHAT &&
        gameInstance?.currentPlayerEntityId
      ) {
        return targetPlayerIds.includes(gameInstance?.currentPlayerEntityId)
      }

      // Don't show notifications in chat
      if (
        messageType === SerializedMessageType.GLOBAL_NOTIFICATION ||
        messageType === SerializedMessageType.TARGETED_NOTIFICATION
      ) {
        return false
      }

      return true
    })
  }

  // Add CSS for animations

  return (
    <div
      id="hud"
      className="fixed inset-0 bg-gray-800 bg-opacity-0 text-white p-4 z-50 pointer-events-none"
      ref={refContainer}
    >
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
        <div className="mt-5 shadow-4xl p-4 rounded-lg bg-gray-800 bg-opacity-20" onClick={() => {checkPricePortfolio();}}>
          <div className="text-sm flex justify-center text-white pointer-events-auto">
              <span className="font-medium">Check Portfolio Price</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-black bg-opacity-20 rounded-xl p-4 z-50 hidden lg:flex flex-col w-[360px] pointer-events-auto space-y-2">
        {/* Other games cards mini section */}
        <div className="grid grid-cols-4 gap-3">
          {gameData.slice(0, 4).map((game: GameInfo) => (
            <MicroGameCard
              key={game.slug}
              title={game.title}
              imageUrl={game.imageUrl}
              slug={game.slug}
            />
          ))}
        </div>

        <div className="overflow-y-auto max-h-64 h-64 space-y-2 pr-2">
          {getFilteredMessages().map((messageComponent, index) => {
            return (
              <div
                key={index}
                ref={index === getFilteredMessages().length - 1 ? messagesEndRef : null}
              >
                <div
                  className={`rounded-lg p-2 ${
                    messageComponent.messageType === SerializedMessageType.TARGETED_CHAT
                      ? 'bg-gray-900 bg-opacity-40 p-2'
                      : 'bg-gray-700 bg-opacity-30'
                  }`}
                >
                  <p className="text-sm break-words">
                    <span
                      className={`font-medium ${
                        messageComponent.messageType === SerializedMessageType.TARGETED_CHAT
                          ? 'text-gray-1000'
                          : ''
                      }`}
                    >
                      {messageComponent.author}
                    </span>
                    : {messageComponent.content}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <input
          type="text"
          placeholder="Type your message..."
          className="p-2 bg-gray-700 bg-opacity-30 text-white rounded-lg"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              sendMessage(e.currentTarget.value)
              e.currentTarget.value = ''
              e.currentTarget.blur() // Remove focus from the input
            }
          }}
        />
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
