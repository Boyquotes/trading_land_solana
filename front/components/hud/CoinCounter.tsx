import { useEffect, useState } from 'react';
import { ServerMessageType } from '@shared/network/server/base';

interface CoinCounterProps {
  gameInstance: any;
}

export function CoinCounter({ gameInstance }: CoinCounterProps) {
  const [coinCount, setCoinCount] = useState<number>(0);

  useEffect(() => {
    if (!gameInstance?.websocketManager) {
      console.warn('[CoinCounter] WebSocket manager not available');
      return;
    }

    // Register a custom message handler with the WebSocketManager
    // This is a more reliable approach than trying to intercept raw WebSocket messages
    const customMessageHandler = (message: any) => {
      // Check if this is a regular message (not a binary message)
      if (message && typeof message === 'object' && message.t === 9) {
        // Check if this is a coin collection message
        if (message.content === 'COIN_COLLECTED' && message.sender === 'SYSTEM') {
          // Increment the coin count
          setCoinCount(prevCount => {
            const newCount = prevCount + 1;
            console.log('[CoinCounter] Coin collected! New count:', newCount);
            return newCount;
          });
        }
      }
    };

    // Create a global function to handle coin collection
    // This will be called directly from the CoinCubeComponent
    if (typeof window !== 'undefined') {
      (window as any).incrementCoinCount = () => {
        setCoinCount(prevCount => {
          const newCount = prevCount + 1;
          console.log('[CoinCounter] Coin collected via global function! New count:', newCount);
          return newCount;
        });
      };
    }

    // Add a custom event listener for coin collection
    // This provides a more reliable way to communicate between components
    const coinCollectedEventHandler = () => {
      setCoinCount(prevCount => {
        const newCount = prevCount + 1;
        console.log('[CoinCounter] Coin collected via custom event! New count:', newCount);
        return newCount;
      });
    };

    // Create and register the custom event
    document.addEventListener('coinCollected', coinCollectedEventHandler);

    // Clean up when the component unmounts
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).incrementCoinCount;
      }
      document.removeEventListener('coinCollected', coinCollectedEventHandler);
    };
  }, [gameInstance]);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 rounded-lg px-4 py-2 text-white font-bold z-50 pointer-events-none">
      <div className="flex items-center justify-center">
        <span className="text-yellow-400 mr-2">🪙</span>
        <span>{coinCount}</span>
      </div>
    </div>
  );
}
