import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TokenAccount } from '../types';

/**
 * Helper function: sleep for ms milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Get token accounts for a wallet address
 * @param walletAddress - The wallet address to fetch token accounts for
 * @param solanaConnection - The Solana connection instance
 * @param includeZeroBalance - Whether to include tokens with zero balance
 * @returns Promise<TokenAccount[]>
 */
export async function getTokenAccounts(
  walletAddress: string,
  solanaConnection: Connection,
  includeZeroBalance: boolean = false
): Promise<TokenAccount[]> {
  try {
    const filters = [
      {
        dataSize: 165, // Size of account (bytes)
      },
      {
        memcmp: {
          offset: 32, // Offset into the account data
          bytes: walletAddress, // Address to compare
        },
      },
    ];

    const accounts = await solanaConnection.getParsedProgramAccounts(
      TOKEN_PROGRAM_ID,
      { filters }
    );

    const tokenAccounts = accounts.map(account => {
      const parsedAccountInfo: any = account.account.data;
      const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
      const tokenAmount = parsedAccountInfo["parsed"]["info"]["tokenAmount"];
      const tokenBalance = tokenAmount["uiAmount"];
      const rawBalance = tokenAmount["amount"];
      const decimals = tokenAmount["decimals"];
      
      return {
        mint: mintAddress,
        balance: tokenBalance || 0,
        rawBalance,
        decimals,
        account: account.pubkey.toString()
      } as TokenAccount;
    });

    // Filter out zero balance tokens if not requested
    if (!includeZeroBalance) {
      return tokenAccounts.filter(token => token.balance > 0);
    }

    return tokenAccounts;
  } catch (error) {
    console.error('Error fetching token accounts:', error);
    throw new Error(`Failed to fetch token accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate if the provided string is a valid Solana address
 * @param address - The address string to validate
 * @returns boolean indicating if the address is valid
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the account info for a specific token mint
 * @param connection - Solana connection
 * @param mintAddress - Token mint address
 * @returns Account info or null if not found
 */
export async function getTokenMintInfo(connection: Connection, mintAddress: string) {
  try {
    const mintPublicKey = new PublicKey(mintAddress);
    const mintInfo = await connection.getParsedAccountInfo(mintPublicKey);
    
    if (mintInfo.value && mintInfo.value.data && typeof mintInfo.value.data === 'object') {
      const parsedData = mintInfo.value.data as any;
      if (parsedData.parsed) {
        return parsedData.parsed.info;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching mint info for ${mintAddress}:`, error);
    return null;
  }
}