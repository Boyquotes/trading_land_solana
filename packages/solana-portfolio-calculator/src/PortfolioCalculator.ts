import { Connection } from '@solana/web3.js';
import {
  PortfolioCalculatorConfig,
  PortfolioResult,
  CalculatePortfolioOptions,
  TokenInfo,
  PortfolioSummary,
  PortfolioError,
  PortfolioErrorType,
  TokenAccount,
  TokenMetadata
} from './types';
import { getTokenAccounts, isValidSolanaAddress } from './utils/tokenAccounts';
import { getTokenMetadata } from './utils/metadata2';

/**
 * Main class for calculating Solana wallet portfolios
 */
export class PortfolioCalculator {
  private connection: Connection;
  private config: PortfolioCalculatorConfig;

  constructor(config: PortfolioCalculatorConfig) {
    this.config = {
      timeout: 30000,
      includeNFTs: true,
      includeZeroBalance: false,
      ...config
    };

    this.connection = new Connection(this.config.rpcEndpoint, {
      commitment: 'confirmed',
      httpHeaders: this.config.customHeaders
    });
  }

  /**
   * Validates if the provided string is a valid Solana address
   * @param address - The address string to validate
   * @returns boolean indicating if the address is valid
   */
  public isValidAddress(address: string): boolean {
    return isValidSolanaAddress(address);
  }

  /**
   * Calculate the complete portfolio for a given Solana address
   * @param address - The Solana wallet address
   * @param options - Calculation options
   * @returns Promise<PortfolioResult>
   */
  public async calculatePortfolio(
    address: string,
    options: CalculatePortfolioOptions = {}
  ): Promise<PortfolioResult> {
    const startTime = Date.now();

    // Merge options with defaults
    const opts: Required<CalculatePortfolioOptions> = {
      includePricing: true,
      includeMetadata: true,
      includeNFTs: this.config.includeNFTs!,
      includeZeroBalance: this.config.includeZeroBalance!,
      maxConcurrency: 10,
      timeout: this.config.timeout!,
      priceProvider: null as any,
      metadataProvider: null as any,
      cacheProvider: null as any,
      ...options
    };

    // Validate the address parameter
    if (!address) {
      throw new PortfolioError(
        PortfolioErrorType.INVALID_ADDRESS,
        'Address parameter is required',
        address
      );
    }

    // Validate that it's a valid Solana address
    if (!this.isValidAddress(address)) {
      throw new PortfolioError(
        PortfolioErrorType.INVALID_ADDRESS,
        'Invalid Solana address format',
        address
      );
    }

    try {
      console.log(`[PortfolioCalculator] Fetching token accounts for address: ${address}`);

      // Get token accounts from blockchain
      const tokenAccounts: TokenAccount[] = await getTokenAccounts(
        address,
        this.connection,
        opts.includeZeroBalance
      );

      console.log(`[PortfolioCalculator] Found ${tokenAccounts.length} token accounts`);

      // Process each token to get metadata and pricing
      const processedTokens: TokenInfo[] = [];
      let metadataFailures = 0;
      let pricingFailures = 0;

      for (const tokenAccount of tokenAccounts) {
        // Skip zero balance tokens if not requested
        if (!opts.includeZeroBalance && tokenAccount.balance <= 0) {
          continue;
        }

        // Skip NFTs if not requested
        if (!opts.includeNFTs && tokenAccount.balance === 1) {
          continue;
        }

        try {
          console.log(`[PortfolioCalculator] Processing token: ${tokenAccount.mint} with balance: ${tokenAccount.balance}`);

          let metadata: TokenMetadata | null = null;
          if (opts.includeMetadata) {
            try {
              if (opts.metadataProvider) {
                metadata = await opts.metadataProvider.getTokenMetadata(tokenAccount.mint, tokenAccount.balance);
              } else {
                metadata = await getTokenMetadata(this.connection, tokenAccount.mint, tokenAccount.balance);
              }
            } catch (error) {
              console.error(`Failed to fetch metadata for ${tokenAccount.mint}:`, error);
              metadataFailures++;
              // Create fallback metadata
              metadata = {
                name: `Token ${tokenAccount.mint.slice(0, 4)}...${tokenAccount.mint.slice(-4)}`,
                symbol: tokenAccount.mint.slice(0, 4).toUpperCase(),
                logo: null,
                description: null,
                externalUrl: null,
                isNFT: tokenAccount.balance === 1,
                metadataUri: null
              };
            }
          }

          // Create token info
          const tokenInfo: TokenInfo = {
            mint: tokenAccount.mint,
            balance: tokenAccount.balance,
            rawBalance: tokenAccount.rawBalance,
            decimals: tokenAccount.decimals,
            account: tokenAccount.account,
            name: metadata?.name || null,
            symbol: metadata?.symbol || null,
            logo: metadata?.logo || null,
            description: metadata?.description || null,
            externalUrl: metadata?.externalUrl || null,
            isNFT: tokenAccount.balance === 1,
            metadataUri: metadata?.metadataUri || null,
            price: null, // TODO: Implement pricing
            valueUSD: null
          };

          processedTokens.push(tokenInfo);

          console.log(`[PortfolioCalculator] Processed token: ${tokenAccount.mint} - ${metadata?.symbol || 'Unknown'}`);
        } catch (error) {
          console.error(`[PortfolioCalculator] Error processing token ${tokenAccount.mint}:`, error);

          // Add token with minimal info even if processing fails
          const fallbackToken: TokenInfo = {
            mint: tokenAccount.mint,
            balance: tokenAccount.balance,
            rawBalance: tokenAccount.rawBalance,
            decimals: tokenAccount.decimals,
            account: tokenAccount.account,
            name: `Token ${tokenAccount.mint.slice(0, 4)}...${tokenAccount.mint.slice(-4)}`,
            symbol: tokenAccount.mint.slice(0, 4).toUpperCase(),
            logo: null,
            description: null,
            externalUrl: null,
            isNFT: tokenAccount.balance === 1,
            metadataUri: null,
            price: null,
            valueUSD: null
          };

          processedTokens.push(fallbackToken);
          metadataFailures++;
        }
      }

      // Sort tokens by balance (descending) and then by name
      processedTokens.sort((a, b) => {
        if (b.balance !== a.balance) {
          return b.balance - a.balance;
        }
        return (a.name || a.symbol || a.mint).localeCompare(b.name || b.symbol || b.mint);
      });

      // Calculate portfolio summary
      const summary = this.calculateSummary(processedTokens);

      const calculationTimeMs = Date.now() - startTime;

      const result: PortfolioResult = {
        success: true,
        address,
        tokens: processedTokens,
        summary,
        lastUpdated: new Date().toISOString(),
        calculationTimeMs,
        metadata: {
          rpcEndpoint: this.config.rpcEndpoint,
          includesNFTs: opts.includeNFTs,
          includesZeroBalance: opts.includeZeroBalance,
          metadataFailures,
          pricingFailures
        }
      };

      console.log(`[PortfolioCalculator] Successfully processed ${processedTokens.length} tokens for address: ${address} in ${calculationTimeMs}ms`);

      return result;

    } catch (error) {
      console.error(`[PortfolioCalculator] Error calculating portfolio for address ${address}:`, error);

      if (error instanceof PortfolioError) {
        throw error;
      }

      throw new PortfolioError(
        PortfolioErrorType.UNKNOWN_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        address
      );
    }
  }

  /**
   * Calculate portfolio summary statistics
   * @param tokens - Array of processed tokens
   * @returns Portfolio summary
   */
  private calculateSummary(tokens: TokenInfo[]): PortfolioSummary {
    const nfts = tokens.filter(t => t.isNFT);
    const fungibleTokens = tokens.filter(t => !t.isNFT);
    const tokensWithPricing = tokens.filter(t => t.price?.usd !== null && t.price?.usd !== undefined);

    const totalValueUSD = tokens.reduce((sum, token) => {
      if (token.valueUSD) {
        return sum + token.valueUSD;
      }
      return sum;
    }, 0);

    // Get top 5 tokens by value
    const topTokensByValue = tokens
      .filter(t => t.valueUSD && t.valueUSD > 0)
      .sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0))
      .slice(0, 5);

    // Get largest holdings by balance
    const largestHoldings = tokens
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    return {
      totalTokens: tokens.length,
      totalNFTs: nfts.length,
      totalFungibleTokens: fungibleTokens.length,
      totalValueUSD,
      tokensWithPricing: tokensWithPricing.length,
      topTokensByValue,
      largestHoldings
    };
  }

  /**
   * Get basic wallet info without full portfolio calculation
   * @param address - The Solana wallet address
   * @returns Basic token count and validation
   */
  public async getWalletInfo(address: string): Promise<{
    isValid: boolean;
    tokenCount: number;
    address: string;
  }> {
    if (!this.isValidAddress(address)) {
      return {
        isValid: false,
        tokenCount: 0,
        address
      };
    }

    try {
      const tokenAccounts = await getTokenAccounts(address, this.connection, false);
      return {
        isValid: true,
        tokenCount: tokenAccounts.length,
        address
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      return {
        isValid: true, // Address is valid format but RPC failed
        tokenCount: 0,
        address
      };
    }
  }

  /**
   * Health check for the calculator
   * @returns Health status
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    rpcEndpoint: string;
    timestamp: string;
    latency?: number;
  }> {
    try {
      const start = Date.now();
      await this.connection.getSlot();
      const latency = Date.now() - start;

      return {
        healthy: true,
        rpcEndpoint: this.config.rpcEndpoint,
        timestamp: new Date().toISOString(),
        latency
      };
    } catch (error) {
      return {
        healthy: false,
        rpcEndpoint: this.config.rpcEndpoint,
        timestamp: new Date().toISOString()
      };
    }
  }
}