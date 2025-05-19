import { useState, useEffect } from 'react';
import axios from 'axios';

export function PricesTable() {
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Symbols to exclude from display
  const excludedSymbols = ['CRO', 'AAVE', 'DAI', 'UNI', 'LINK', 'USDC', 'ETH', 'USDT', 'GT', 'FDUSD'];

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        // Use the local API proxy instead of directly calling the external API
        const response = await axios.get('/api/prices');
        
        // Filter out excluded symbols and get first 30 items
        const filteredItems = response.data.data
          .filter((item: any) => !excludedSymbols.includes(item.symbol))
          .slice(0, 30);
          
        setPrices(filteredItems);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching prices:', err);
        setError('Failed to load prices data');
        setLoading(false);
      }
    };

    fetchPrices();
    
    // Refresh data every 60 seconds
    const intervalId = setInterval(fetchPrices, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm py-2">{error}</div>
    );
  }

  return (
    <table className="w-full text-sm text-left text-white">
      <thead className="text-xs uppercase bg-gray-700 bg-opacity-50">
        <tr>
          <th scope="col" className="px-2 py-1">Symbol</th>
          <th scope="col" className="px-2 py-1">Price (USD)</th>
          <th scope="col" className="px-2 py-1">1h %</th>
        </tr>
      </thead>
      <tbody>
        {prices.length > 0 ? (
          prices.map((price, index) => (
            <tr key={index} className="border-b border-gray-700 border-opacity-50 hover:bg-gray-600 hover:bg-opacity-30">
              <td className="px-2 py-1 font-medium">{price.symbol}</td>
              <td className="px-2 py-1">${Number(price.price_usd).toFixed(2)}</td>
              <td className={`px-2 py-1 ${Number(price.percentChange1h) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {Number(price.percentChange1h) >= 0 ? '+' : ''}{Number(price.percentChange1h).toFixed(2)}%
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={3} className="px-2 py-4 text-center">No trades available</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
