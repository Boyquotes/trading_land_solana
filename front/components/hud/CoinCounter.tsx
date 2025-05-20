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

    // Add a custom event listener for coin collection
    // This is the only way we'll update the counter to prevent double counting
    const coinCollectedEventHandler = (event: Event) => {
      // Safely increment the coin count
      setCoinCount(prevCount => {
        const newCount = prevCount + 1;
        console.log('[CoinCounter] Coin collected! New count:', newCount);
        return newCount;
      });
    };

    // Register the event listener
    console.log('[CoinCounter] Adding coinCollected event listener');
    document.addEventListener('coinCollected', coinCollectedEventHandler);

    // Clean up when the component unmounts
    return () => {
      console.log('[CoinCounter] Removing coinCollected event listener');
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
