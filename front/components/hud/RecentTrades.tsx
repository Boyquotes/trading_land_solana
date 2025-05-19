import { useState } from 'react';

interface RecentTradesProps {
  isTradesBoxExpanded: boolean;
  setIsTradesBoxExpanded: (expanded: boolean) => void;
}

export function RecentTrades({ isTradesBoxExpanded, setIsTradesBoxExpanded }: RecentTradesProps) {
  // État pour suivre quel type de trades est visible (Drift ou Jupiter)
  const [isDriftTradesVisible, setIsDriftTradesVisible] = useState<boolean>(true);

  return (
    <div className="fixed bottom-4 left-4 transform translate-y-20 pointer-events-auto">
      <div className="shadow-4xl p-4 rounded-lg space-y-1 bg-gray-800 bg-opacity-20 max-w-xs transition-all duration-300 ease-in-out">
        <p 
          className="text-sm font-bold cursor-pointer flex items-center justify-between"
          onClick={() => setIsTradesBoxExpanded(!isTradesBoxExpanded)}
        >
          Recent Trades
          <span className={`transition-transform duration-300 ${isTradesBoxExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </p>
        
        {isTradesBoxExpanded && (
          <div className="mt-2">
            <div className="flex space-x-2 mb-2">
              <button 
                className={`text-xs px-2 py-1 rounded-full ${isDriftTradesVisible ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                onClick={() => setIsDriftTradesVisible(true)}
              >
                Drift
              </button>
              <button 
                className={`text-xs px-2 py-1 rounded-full ${!isDriftTradesVisible ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                onClick={() => setIsDriftTradesVisible(false)}
              >
                Jupiter
              </button>
            </div>
            
            <div className="max-h-40 overflow-y-auto custom-scrollbar">
              {isDriftTradesVisible ? (
                <div className="text-center py-2 text-gray-400 text-xs">
                  Drift trades will appear here
                </div>
              ) : (
                <div className="text-center py-2 text-gray-400 text-xs">
                  Jupiter trades will appear here
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
