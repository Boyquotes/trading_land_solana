/* eslint-disable react/jsx-no-undef */
import { useEffect, useState } from 'react'
import { Joystick } from 'react-joystick-component'
import { Game } from '@/game/Game'
import Link from 'next/link'
import { SerializedMessageType } from '@shared/network/server/serialized'
import { MessageComponent } from '@shared/component/MessageComponent'
import Image from 'next/image'
import { MicroGameCard } from './GameCard'
import { GameInfo } from '@/types'
import gameData from '../public/gameData.json'
import { VehicleSystem } from '../game/ecs/system/VehicleSystem.js'
import { Connection, PublicKey } from "@solana/web3.js";

// Import extracted components
import {
  PricesTable,
  Portfolio,
  Notifications,
  AudioControls,
  ChatBox,
  WalletConnector,
  WalletDropdown,
  RecentTrades,
  WalletTransactions,
  CoinCounter
} from './hud'

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
  const [entities, setEntities] = useState<any[]>([]);
  const vehicleSystem = new VehicleSystem();
  
  // State for UI components
  const [isPricesBoxExpanded, setIsPricesBoxExpanded] = useState<boolean>(false);
  const [isTradesBoxExpanded, setIsTradesBoxExpanded] = useState<boolean>(false);
  const [isPortfolioBoxExpanded, setIsPortfolioBoxExpanded] = useState<boolean>(false);
  
  // State for notifications
  const [notifications, setNotifications] = useState<
    Array<{ id: number; content: string; author: string; timestamp: number }>
  >([]);
  
  // State for wallet
  const [addresses, setAddresses] = useState<string[]>([]);
  const [wallet, setWallet] = useState<{[address: string]: Array<{mint: string, balance: number, name?: string | null, symbol?: string | null, logo?: string | null, tokenIsNFT?: boolean, valueStableCoin?: number | null}>}>({});
  
  // Initialize Solana connection
  const rpcEndpoint = process.env.NEXT_PUBLIC_RPC_URL;
  const solanaConnection = new Connection(rpcEndpoint);
  
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
  // addWoodCubeEntity()
  // Use the WalletConnector hook
  const {
    detectedWallets,
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
  } = WalletConnector({
    onAddressesChange: setAddresses,
    onWalletChange: setWallet,
    setNotifications,
    gameInstance
  });
  
  // Handle notifications from chat messages
  useEffect(() => {
    // Use the messages prop that was destructured in the component parameters
    // The prop was renamed to messageComponents in the destructuring
    if (messageComponents && messageComponents.length > 0) {
      // Get the most recent message
      const latestMessage = messageComponents[messageComponents.length - 1];
      
      // Only process system messages or messages from other players (not from the current player)
      if (latestMessage && latestMessage.type !== SerializedMessageType.PLAYER) {
        // Create a notification from the message
        const notifId = Date.now();
        setNotifications(prev => [
          ...prev,
          {
            id: notifId,
            content: latestMessage.content,
            author: latestMessage.author || 'System',
            timestamp: notifId
          }
        ]);
        
        // Auto-remove the notification after 5 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notifId));
        }, 5000);
      }
    }
  }, [messageComponents]);
  
  return (
    <div
      id="hud"
      className="fixed inset-0 bg-gray-800 bg-opacity-0 text-white p-4 z-50 pointer-events-none"
    >
      {/* Top left - Game logo */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Trading Land"
            width={150}
            height={50}
            className="h-10 w-auto"
          />
        </Link>
      </div>

      {/* Top right - Wallet connection */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => {
              // Utiliser la fonction setWalletDropdownOpen fournie par WalletConnector
              // pour basculer correctement l'état du dropdown
              // Inverser explicitement l'état actuel pour s'assurer que le basculement fonctionne correctement
              setWalletDropdownOpen((prevState) => !prevState);
            }}
            className="wallet-button bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center space-x-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path
                fillRule="evenodd"
                d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              {addresses.length > 0
                ? `${addresses.length} Wallet${
                    addresses.length !== 1 ? 's' : ''
                  }`
                : 'Connect Wallet'}
            </span>
          </button>
          
          <WalletDropdown
            walletDropdownOpen={walletDropdownOpen}
            walletDropdownRef={walletDropdownRef}
            addresses={addresses}
            detectedWallets={detectedWallets}
            wallet={wallet}
            loadingPortfolio={loadingPortfolio}
            loadingPrice={loadingPrice}
            liveTokenCount={liveTokenCount}
            handleWalletConnect={handleWalletConnect}
            disconnectWallet={disconnectWallet}
            refreshTokenPrices={refreshTokenPrices}
          />
        </div>
      </div>

      {/* Global Notifications */}
      <Notifications notifications={notifications} />

      {/* Bottom left - Prices Box */}
      {/* <div className="fixed bottom-4 left-4 pointer-events-auto">
        <div className="shadow-4xl p-4 rounded-lg space-y-1 bg-gray-800 bg-opacity-20 max-w-xs transition-all duration-300 ease-in-out">
          <p 
            className="text-sm font-bold cursor-pointer flex items-center justify-between"
            onClick={() => setIsPricesBoxExpanded(!isPricesBoxExpanded)}
          >
            Market Prices
            <span className={`transition-transform duration-300 ${isPricesBoxExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </p>
          
          {isPricesBoxExpanded && (
            <div className="mt-2 max-h-60 overflow-y-auto custom-scrollbar">
              <PricesTable />
            </div>
          )}
        </div>
      </div> */}

      {/* Bottom left - Trades Box (positioned below Prices Box) */}
      {/* <RecentTrades 
        isTradesBoxExpanded={isTradesBoxExpanded}
        setIsTradesBoxExpanded={setIsTradesBoxExpanded}
      /> */}

      {/* Portfolio Box - Positioned at the bottom left */}
      <div className="fixed bottom-4 left-4 pointer-events-auto z-50">
        <Portfolio 
          isPortfolioBoxExpanded={isPortfolioBoxExpanded}
          setIsPortfolioBoxExpanded={setIsPortfolioBoxExpanded}
          setNotifications={setNotifications}
        />
      </div>

      {/* Bottom right - Audio controls */}
      {/* <AudioControls gameInstance={gameInstance} /> */}

      {/* Bottom right - Chat box */}
      {/*
      <div className="fixed bottom-20 right-4 pointer-events-auto">
         <ChatBox messages={messageComponents} sendMessage={sendMessage} />
      </div>
      */}
      
      {/* Coin Counter - Positioned at the top center */}
      {gameInstance && (
        <CoinCounter 
          gameInstance={gameInstance} 
        />
      )}

      {/* Invisible component for wallet transactions */}
      <WalletTransactions
        address={addresses[0]}
        solanaConnection={solanaConnection}
        setNotifications={setNotifications}
      />
    </div>
  );
}