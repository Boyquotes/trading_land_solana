import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

type PortfolioItem = {
  _id: string;
  symbol: string;
  mint: string;
  actualPrice: number;
  averagePrice: number;
  numberCoin: number;
  name: string;
  logo: string;
  exchange: string[];
  totalActualPrice: number;
  totalPrice: number;
  dateImport: string;
};

type NotificationType = {
  id: number;
  content: string;
  author: string;
  timestamp: number;
};

interface PortfolioProps {
  isPortfolioBoxExpanded: boolean;
  setIsPortfolioBoxExpanded: (expanded: boolean) => void;
  setNotifications: (notificationsFn: (prev: NotificationType[]) => NotificationType[]) => void;
}

export function Portfolio({ isPortfolioBoxExpanded, setIsPortfolioBoxExpanded, setNotifications }: PortfolioProps) {
  // Portfolio data state
  const [portfolioData, setPortfolioData] = useState<PortfolioItem[]>([]);
  
  // Loading state for portfolio data
  const [loadingPortfolioData, setLoadingPortfolioData] = useState<boolean>(false);
  
  // Calculate total portfolio value
  const totalPortfolioValue = useMemo(() => {
    return portfolioData.reduce((total, item) => total + item.totalActualPrice, 0).toFixed(2);
  }, [portfolioData]);

  // Fetch portfolio data from API
  useEffect(() => {
    const fetchPortfolioData = async (walletAddress?: string) => {
      try {
        setLoadingPortfolioData(true);
        // Use the address parameter if provided
        const url = walletAddress 
          ? `/api/portfolio?address=${walletAddress}` 
          : '/api/portfolio';
        
        console.log(`Fetching portfolio data from: ${url}`);
        const response = await axios.get(url);
        setPortfolioData(response.data.data);
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
        // Set a notification about the error
        const notifId = Date.now();
        setNotifications(prev => [...prev, { 
          id: notifId, 
          content: `Failed to load portfolio data`, 
          author: "System", 
          timestamp: notifId 
        }]);
        setTimeout(() => {
          setNotifications(prev => prev.filter((n) => n.id !== notifId));
        }, 5000);
      } finally {
        setLoadingPortfolioData(false);
      }
    };

    // Start with no specific address
    // fetchPortfolioData();
    
    // Add this function to the component's scope so it can be called elsewhere
    // For example, when a user selects a specific wallet
    // Define the type properly to avoid TypeScript errors
    interface CustomWindow extends Window {
      fetchWalletPortfolio?: (address?: string) => Promise<void>;
    }
    
    // Assign the function to the window object
    (window as CustomWindow).fetchWalletPortfolio = fetchPortfolioData;
  }, [setNotifications]);

  return (
    <div className="shadow-4xl p-4 rounded-lg space-y-1 bg-gray-800 bg-opacity-20 max-w-xs transition-all duration-300 ease-in-out">
      <p 
        className="text-sm font-bold cursor-pointer flex items-center justify-between"
        onClick={() => setIsPortfolioBoxExpanded(!isPortfolioBoxExpanded)}
      >
        Portfolio
        <span className="text-xs bg-blue-500 px-2 py-0.5 rounded-full">
          ${totalPortfolioValue}
        </span>
      </p>
      
      {isPortfolioBoxExpanded && (
        <div className="mt-2 max-h-60 overflow-y-auto custom-scrollbar">
          {loadingPortfolioData ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : portfolioData.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="text-xs uppercase bg-gray-700 bg-opacity-50">
                <tr>
                  <th className="px-1 py-1 text-left">Asset</th>
                  <th className="px-1 py-1 text-right">Amount</th>
                  <th className="px-1 py-1 text-right">Value</th>
                  <th className="px-1 py-1 text-right">P/L</th>
                </tr>
              </thead>
              <tbody>
                {portfolioData.map((item, index) => {
                  // Calculate profit/loss percentage
                  const plPercentage = ((item.actualPrice - item.averagePrice) / item.averagePrice) * 100;
                  
                  return (
                    <tr key={index} className="border-b border-gray-700 border-opacity-30">
                      <td className="px-1 py-1 flex items-center">
                        {item.logo ? (
                          <img src={item.logo} alt={item.symbol} className="w-4 h-4 mr-1 rounded-full" />
                        ) : (
                          <div className="w-4 h-4 mr-1 bg-gray-600 rounded-full flex items-center justify-center text-[8px]">
                            {item.symbol.substring(0, 1)}
                          </div>
                        )}
                        <span>{item.symbol}</span>
                      </td>
                      <td className="px-1 py-1 text-right">{item.numberCoin.toFixed(2)}</td>
                      <td className="px-1 py-1 text-right">${item.totalActualPrice.toFixed(2)}</td>
                      <td className={`px-1 py-1 text-right ${plPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {plPercentage.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-2 text-gray-400 text-xs">
              No portfolio data available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
