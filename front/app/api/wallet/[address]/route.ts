import { NextResponse } from 'next/server';
import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenAccounts, getTokenMetadata } from '../../../../components/hud/utils/TokenUtils';

// Types for the API response
export interface TokenInfo {
  mint: string;
  balance: number;
  name?: string | null;
  symbol?: string | null;
  logo?: string | null;
  tokenIsNFT?: boolean;
  valueStableCoin?: number | null;
  price?: number | null;
  priceSource?: string | null;
}

export interface WalletResponse {
  success: boolean;
  address: string;
  tokens: TokenInfo[];
  totalTokens: number;
  lastUpdated: string;
  error?: string;
}

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  const { address } = params;

  // Validate the address parameter
  if (!address) {
    return NextResponse.json({
      success: false,
      error: 'Address parameter is required'
    } as WalletResponse, { status: 400 });
  }

  // Validate that it's a valid Solana address
  try {
    new PublicKey(address);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Invalid Solana address format'
    } as WalletResponse, { status: 400 });
  }

  try {
    // Initialize Solana connection
    const rpcEndpoint: string = process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";
    const solanaConnection = new Connection(rpcEndpoint);

    console.log(`[Wallet API] Fetching token accounts for address: ${address}`);

    // Get token accounts from blockchain
    const tokenAccounts = await getTokenAccounts(address, solanaConnection);
    
    console.log(`[Wallet API] Found ${tokenAccounts.length} token accounts`);

    // Process each token to get metadata
    const processedTokens: TokenInfo[] = [];
    
    for (const token of tokenAccounts) {
      if (token.balance <= 0) continue;
      
      try {
        console.log(`[Wallet API] Processing token: ${token.mint} with balance: ${token.balance}`);
        
        const metadata = await getTokenMetadata(token.mint, token.balance);
        
        const tokenInfo: TokenInfo = {
          mint: token.mint,
          balance: token.balance,
          name: metadata?.name || null,
          symbol: metadata?.symbol || null,
          logo: metadata?.logo || null,
          tokenIsNFT: token.balance === 1,
          valueStableCoin: null,
          price: null,
          priceSource: null
        };
        
        processedTokens.push(tokenInfo);
        
        console.log(`[Wallet API] Processed token: ${token.mint} - ${metadata?.symbol || 'Unknown'}`);
      } catch (error) {
        console.error(`[Wallet API] Error processing token ${token.mint}:`, error);
        
        // Add token with minimal info even if metadata fetch fails
        const fallbackToken: TokenInfo = {
          mint: token.mint,
          balance: token.balance,
          name: `Token ${token.mint.slice(0, 4)}...${token.mint.slice(-4)}`,
          symbol: token.mint.slice(0, 4).toUpperCase(),
          logo: null,
          tokenIsNFT: token.balance === 1,
          valueStableCoin: null,
          price: null,
          priceSource: null
        };
        
        processedTokens.push(fallbackToken);
      }
    }

    // Sort tokens by balance (descending) and then by name
    processedTokens.sort((a, b) => {
      if (b.balance !== a.balance) {
        return b.balance - a.balance;
      }
      return (a.name || a.symbol || a.mint).localeCompare(b.name || b.symbol || b.mint);
    });

    const response: WalletResponse = {
      success: true,
      address,
      tokens: processedTokens,
      totalTokens: processedTokens.length,
      lastUpdated: new Date().toISOString()
    };

    console.log(`[Wallet API] Successfully processed ${processedTokens.length} tokens for address: ${address}`);

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      }
    });

  } catch (error) {
    console.error(`[Wallet API] Error fetching wallet for address ${address}:`, error);
    
    const errorResponse: WalletResponse = {
      success: false,
      address,
      tokens: [],
      totalTokens: 0,
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Optional: Add POST method for caching or updating wallet data
export async function POST(
  request: Request,
  { params }: { params: { address: string } }
) {
  return NextResponse.json({
    success: false,
    error: 'POST method not implemented yet'
  }, { status: 501 });
}