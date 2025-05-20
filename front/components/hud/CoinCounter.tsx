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

    // Create a custom message handler for coin collection messages
    const handleCoinCollectionMessage = (message: any) => {
      try {
        // Check if this is a coin collection message
        if (message.t === 9 && // SerializedComponentType.MESSAGE
            message.content === 'COIN_COLLECTED' && 
            message.sender === 'SYSTEM') {
          
          // Increment the coin count
          setCoinCount(prevCount => {
            const newCount = prevCount + 1;
            console.log('[CoinCounter] Coin collected! New count:', newCount);
            return newCount;
          });
        }
      } catch (error) {
        // Ignore parsing errors
      }
    };

    // Create a direct event listener for the WebSocket
    const messageHandler = (event: MessageEvent) => {
      try {
        // Try to parse the message data
        const data = JSON.parse(event.data);
        handleCoinCollectionMessage(data);
      } catch (error) {
        // Ignore parsing errors for binary data
      }
    };

    // Add a direct event listener to the WebSocket
    if (gameInstance.websocketManager.websocket) {
      console.log('[CoinCounter] Adding direct WebSocket message listener');
      gameInstance.websocketManager.websocket.addEventListener('message', messageHandler);
    }

    // Also create a global function to increment the counter directly
    // This provides a fallback method for incrementing the counter
    if (typeof window !== 'undefined') {
      (window as any).incrementCoinCount = () => {
        setCoinCount(prevCount => {
          const newCount = prevCount + 1;
          console.log('[CoinCounter] Coin collected via global function! New count:', newCount);
          return newCount;
        });
      };
    }

    // Clean up when the component unmounts
    return () => {
      if (gameInstance.websocketManager.websocket) {
        gameInstance.websocketManager.websocket.removeEventListener('message', messageHandler);
      }
      
      if (typeof window !== 'undefined') {
        delete (window as any).incrementCoinCount;
      }
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
