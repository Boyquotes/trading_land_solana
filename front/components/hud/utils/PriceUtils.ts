import axios from 'axios';
import { sleep } from './TokenUtils';

// Fetch price for a CoinGecko ID with rate limiting
export async function fetchTokenPrice(coinGeckoId: string, lastCoinGeckoCall: number, setLastCoinGeckoCall: (time: number) => void): Promise<number | null> {
  try {
    // Implement rate limiting for CoinGecko API
    const now = Date.now();
    const timeSinceLastCall = now - lastCoinGeckoCall;
    const minimumInterval = 6500; // At least 6.1 seconds between calls (CoinGecko free tier limit is ~10 calls per minute)
    
    // If we need to wait before making another call
    if (timeSinceLastCall < minimumInterval) {
      const waitTime = minimumInterval - timeSinceLastCall;
      console.log(`Rate limiting CoinGecko API - waiting ${waitTime}ms before next call`);
      await sleep(waitTime);
    }
    
    // Update the last call time
    setLastCoinGeckoCall(Date.now());
    
    // Make the API call with error handling
    console.log(`Fetching CoinGecko price for: ${coinGeckoId}`);
    const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`);
    
    if (res.status === 429) {
      console.error("CoinGecko rate limit exceeded (429 error). Implementing longer delay.");
      await sleep(10000); // 10 second cooldown if we hit the rate limit
      return null;
    }
    
    return res.data[coinGeckoId]?.usd ?? null;
  } catch (error) {
    // Check if error is specifically a rate limit error
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      console.error("CoinGecko rate limit exceeded (429 error). Need to wait longer between requests.");
    } else {
      console.error("Error fetching price from CoinGecko:", error);
    }
    return null;
  }
}

// Helper function to get price from Jupiter API
export async function getJupiterPrice(mintAddress: string): Promise<number | null> {
  try {
    // Type validation to ensure mintAddress is a string
    if (!mintAddress || typeof mintAddress !== 'string') {
      console.warn('Invalid mintAddress passed to getJupiterPrice:', mintAddress);
      return null;
    }

    // Jupiter API endpoint for price data
    const jupiterPriceEndpoint = `https://price.jup.ag/v4/price?ids=${mintAddress}`;
    
    // Make the API call with error handling
    console.log(`Fetching Jupiter price for: ${mintAddress}`);
    
    // Use a timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await axios.get(jupiterPriceEndpoint, {
        signal: controller.signal,
        validateStatus: (status) => {
          // Consider any status code as successful to handle them manually
          return true;
        }
      });
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
      
      // Handle non-200 status codes
      if (response.status !== 200) {
        // Handle silently - just log the issue
        console.warn(`Failed to fetch Jupiter price, status: ${response.status} for mint: ${mintAddress}`);
        return null;
      }
      
      // Extract price from Jupiter response
      const priceData = response.data?.data?.[mintAddress];
      if (priceData && typeof priceData.price === 'number') {
        return priceData.price;
      } else {
        // Token exists in Jupiter but no price data available
        console.warn(`Price information not found in Jupiter API for mintAddress: ${mintAddress}`);
        return null;
      }
    } catch (innerError) {
      // Clear the timeout to prevent memory leaks
      clearTimeout(timeoutId);
      
      // Handle abort errors silently
      if (innerError.name === 'AbortError') {
        console.warn(`Jupiter API request timed out for mintAddress: ${mintAddress}`);
        return null;
      }
      
      // Vérifier spécifiquement les erreurs Axios
      if (axios.isAxiosError(innerError)) {
        const statusCode = innerError.response?.status;
        const errorMessage = innerError.response?.data?.error || innerError.message;
        
        console.warn(`Axios error fetching from Jupiter API for mintAddress: ${mintAddress}. Status: ${statusCode || 'unknown'}, Message: ${errorMessage}`);
        
        // Gérer différents codes d'erreur
        if (statusCode !== undefined) {
          if (statusCode === 429) {
            console.warn('Rate limit exceeded for Jupiter API');
          } else if (statusCode >= 500) {
            console.warn('Jupiter API server error');
          } else if (statusCode >= 400) {
            console.warn('Jupiter API client error (bad request or not found)');
          }
        } else {
          console.warn('Jupiter API error with unknown status code');
        }
      } else {
        // Handle other fetch errors silently
        console.warn(`Error fetching from Jupiter API for mintAddress: ${mintAddress}`, innerError);
      }
      
      return null;
    }
  } catch (error) {
    // Catch and handle any other unexpected errors silently
    console.warn(`Failed to fetch price from Jupiter API for mintAddress: ${mintAddress}`, error);
    return null;
  }
}

// Helper function to get price from Binance API
export async function getBinancePrice(symbol: string | null): Promise<number | null> {
  try {
    // Type validation to ensure symbol is a string
    if (!symbol || typeof symbol !== 'string') {
      console.warn('Invalid symbol passed to getBinancePrice:', symbol);
      return null;
    }

    // Format the symbol for Binance API (append USDT and remove any spaces, make uppercase)
    const formattedSymbol = `${symbol.replace(/\\s+/g, '').toUpperCase()}USDT`;
    
    // First check if this market exists on Binance
    try {
      // Binance API endpoint for exchange info
      const exchangeInfoEndpoint = 'https://api.binance.com/api/v3/exchangeInfo';
      const exchangeInfoResponse = await axios.get(exchangeInfoEndpoint);
      
      if (exchangeInfoResponse.status !== 200) {
        console.error(`Failed to fetch Binance exchange info, status: ${exchangeInfoResponse.status}`);
        return null;
      }
      
      // Check if the symbol exists in the available symbols
      const symbolExists = exchangeInfoResponse.data.symbols.some(
        (marketInfo: any) => marketInfo.symbol === formattedSymbol && marketInfo.status === 'TRADING'
      );
      
      if (!symbolExists) {
        console.warn(`Market ${formattedSymbol} does not exist on Binance or is not currently trading`);
        return null;
      }
      
      console.log(`Market ${formattedSymbol} exists on Binance, proceeding to fetch price`);
    } catch (error) {
      console.error('Error checking if market exists on Binance:', error);
      // Continue with price fetch attempt even if market check fails
    }
    
    // Binance API endpoint for price data
    const binancePriceEndpoint = `https://api.binance.com/api/v3/ticker/price?symbol=${formattedSymbol}`;
    
    // Make the API call with error handling
    console.log(`Fetching Binance price for: ${formattedSymbol}`);
    const response = await axios.get(binancePriceEndpoint);
    
    if (response.status !== 200) {
      console.error(`Failed to fetch Binance price, status: ${response.status}`);
      return null;
    }
    
    // Extract price from Binance response
    if (response.data && typeof response.data.price === 'string') {
      const price = parseFloat(response.data.price);
      if (!isNaN(price)) {
        return price;
      }
    }

    console.warn(`Price information not found in Binance API for symbol: ${symbol}`);
    return null;
  } catch (error) {
    // Check if error is specifically a Not Found error (symbol doesn't exist)
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      console.warn(`Symbol ${symbol} not found on Binance API`);
    } else {
      console.error(`Failed to fetch price from Binance API for symbol: ${symbol}`, error);
    }
    return null;
  }
}

// Find CoinGecko ID for a token symbol
export async function findCoinGeckoId(symbol: string | null | undefined, coinGeckoCoins: any[] | null): Promise<string | null> {
  try {
    if (!symbol || !coinGeckoCoins || coinGeckoCoins.length === 0) {
      return null;
    }
    
    // Normalize the symbol (uppercase, no spaces)
    const normalizedSymbol = symbol.toUpperCase().replace(/\\s+/g, '');
    
    // Find exact match first
    const exactMatch = coinGeckoCoins.find(coin => 
      coin.symbol.toUpperCase() === normalizedSymbol
    );
    
    if (exactMatch) {
      console.log(`Found exact CoinGecko match for ${symbol}: ${exactMatch.id}`);
      return exactMatch.id;
    }
    
    // If no exact match, try to find a coin with the symbol as part of its name
    const nameMatch = coinGeckoCoins.find(coin => 
      coin.name.toUpperCase().includes(normalizedSymbol)
    );
    
    if (nameMatch) {
      console.log(`Found CoinGecko name match for ${symbol}: ${nameMatch.id}`);
      return nameMatch.id;
    }
    
    console.log(`No CoinGecko ID found for symbol: ${symbol}`);
    return null;
  } catch (error) {
    console.error('Error finding CoinGecko ID:', error);
    return null;
  }
}

// Fetch CoinGecko coins list
export async function fetchCoinGeckoCoins(): Promise<any[] | null> {
  try {
    console.log('Fetching CoinGecko coins list...');
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/list');
    console.log(`Fetched ${response.data.length} coins from CoinGecko`);
    return response.data;
  } catch (error) {
    console.error('Error fetching CoinGecko coins list:', error);
    return null;
  }
}
