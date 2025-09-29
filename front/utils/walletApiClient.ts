// Example usage of the new wallet API endpoint
// This file demonstrates how to use the /api/wallet/[address] endpoint

import { TokenInfo, WalletResponse } from '../app/api/wallet/[address]/route';

/**
 * Fetch wallet content using the new dedicated endpoint
 * @param address Solana wallet address
 * @returns Promise containing wallet data or null if error
 */
export const fetchWalletContent = async (address: string): Promise<TokenInfo[] | null> => {
  try {
    const response = await fetch(`/api/wallet/${address}`);
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return null;
    }
    
    const data: WalletResponse = await response.json();
    
    if (!data.success) {
      console.error('API returned error:', data.error);
      return null;
    }
    
    console.log(`Successfully fetched ${data.totalTokens} tokens for address: ${address}`);
    console.log('Last updated:', data.lastUpdated);
    
    return data.tokens;
  } catch (error) {
    console.error('Error fetching wallet content:', error);
    return null;
  }
};

/**
 * Fetch wallet content with detailed response information
 * @param address Solana wallet address
 * @returns Promise containing full wallet response
 */
export const fetchWalletContentDetailed = async (address: string): Promise<WalletResponse | null> => {
  try {
    const response = await fetch(`/api/wallet/${address}`);
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return null;
    }
    
    const data: WalletResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching wallet content:', error);
    return null;
  }
};

/**
 * Filter tokens by type (NFTs vs regular tokens)
 * @param tokens Array of token info
 * @param isNFT true for NFTs, false for regular tokens
 * @returns Filtered array of tokens
 */
export const filterTokensByType = (tokens: TokenInfo[], isNFT: boolean): TokenInfo[] => {
  return tokens.filter(token => token.tokenIsNFT === isNFT);
};

/**
 * Get total value of wallet (if price data is available)
 * @param tokens Array of token info
 * @returns Total value in USD or 0 if no price data
 */
export const calculateWalletValue = (tokens: TokenInfo[]): number => {
  return tokens.reduce((total, token) => {
    if (token.price && token.balance) {
      return total + (token.price * token.balance);
    }
    return total;
  }, 0);
};

// Example usage:
/*
const exampleUsage = async () => {
  const address = "YOUR_SOLANA_ADDRESS_HERE";
  
  // Fetch wallet content
  const tokens = await fetchWalletContent(address);
  
  if (tokens) {
    console.log(`Found ${tokens.length} tokens:`);
    
    // Separate NFTs from regular tokens
    const nfts = filterTokensByType(tokens, true);
    const regularTokens = filterTokensByType(tokens, false);
    
    console.log(`NFTs: ${nfts.length}`);
    console.log(`Regular tokens: ${regularTokens.length}`);
    
    // Calculate total value (if price data available)
    const totalValue = calculateWalletValue(tokens);
    console.log(`Total wallet value: $${totalValue.toFixed(2)}`);
    
    // Display token details
    tokens.forEach(token => {
      console.log(`${token.symbol || 'Unknown'}: ${token.balance} (${token.name || 'Unknown name'})`);
    });
  }
};
*/