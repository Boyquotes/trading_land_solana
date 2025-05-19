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
  // Nouvelles propriétés pour le prix et la valeur calculée
  price?: number | null;
  value?: number | null;
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
        
        // Ajouter un timestamp pour éviter le cache du navigateur
        const urlWithTimestamp = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
        
        console.log(`Fetching portfolio data from: ${urlWithTimestamp}`);
        const response = await axios.get(urlWithTimestamp);
        
        if (response.data && response.data.data) {
          console.log('Portfolio data received:', response.data.data.length, 'items');
          setPortfolioData(response.data.data);
        } else {
          console.warn('Portfolio data is empty or invalid:', response.data);
        }
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
                  
                  // Utiliser la valeur calculée si disponible, sinon utiliser totalActualPrice
                  const displayValue = item.value !== undefined && item.value !== null 
                    ? item.value 
                    : item.totalActualPrice;
                  
                  return (
                    <tr key={item._id} className="border-b border-gray-700 border-opacity-50">
                      <td className="px-1 py-1 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.logo && (
                            <img src={item.logo} alt={item.symbol} className="w-4 h-4 mr-1 rounded-full" />
                          )}
                          <span className="font-medium">{item.symbol}</span>
                        </div>
                      </td>
                      <td className="px-1 py-1 text-right">
                        {item.numberCoin.toFixed(2)}
                      </td>
                      <td className="px-1 py-1 text-right">
                        ${typeof displayValue === 'number' ? displayValue.toFixed(2) : '0.00'}
                      </td>
                      <td className="px-1 py-1 text-right">
                        <span className={plPercentage >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {plPercentage >= 0 ? '+' : ''}{plPercentage.toFixed(2)}%
                        </span>
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
