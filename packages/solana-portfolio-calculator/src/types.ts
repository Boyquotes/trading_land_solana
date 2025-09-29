/**
 * Core types and interfaces for the Solana Portfolio Calculator
 */

/**
 * Configuration options for the PortfolioCalculator
 */
export interface PortfolioCalculatorConfig {
  /** Solana RPC endpoint URL */
  rpcEndpoint: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Whether to include NFTs in portfolio calculation (default: true) */
  includeNFTs?: boolean;
  /** Whether to include zero balance tokens (default: false) */
  includeZeroBalance?: boolean;
  /** Custom headers for RPC requests */
  customHeaders?: Record<string, string>;
}

/**
 * Raw token account data from Solana blockchain
 */
export interface TokenAccount {
  /** Token mint address */
  mint: string;
  /** Token balance (UI amount) */
  balance: number;
  /** Raw balance in smallest unit */
  rawBalance?: string;
  /** Account address */
  account?: string;
  /** Decimals of the token */
  decimals?: number;
}

/**
 * Token metadata information
 */
export interface TokenMetadata {
  /** Token name */
  name?: string | null;
  /** Token symbol */
  symbol?: string | null;
  /** Token logo URI */
  logo?: string | null;
  /** Token description */
  description?: string | null;
  /** External URL */
  externalUrl?: string | null;
  /** Whether this is an NFT (balance = 1) */
  isNFT?: boolean;
  /** Metadata URI */
  metadataUri?: string | null;
}

/**
 * Token price information
 */
export interface TokenPrice {
  /** Price in USD */
  usd?: number | null;
  /** Price source (e.g., "coingecko", "jupiter") */
  source?: string | null;
  /** Last updated timestamp */
  lastUpdated?: string | null;
  /** 24h price change percentage */
  change24h?: number | null;
  /** Market cap */
  marketCap?: number | null;
  /** Volume 24h */
  volume24h?: number | null;
}

/**
 * Complete token information including account, metadata, and pricing
 */
export interface TokenInfo {
  /** Token mint address */
  mint: string;
  /** Token balance (UI amount) */
  balance: number;
  /** Raw balance in smallest unit */
  rawBalance?: string;
  /** Token decimals */
  decimals?: number;
  /** Token metadata */
  name?: string | null;
  symbol?: string | null;
  logo?: string | null;
  description?: string | null;
  externalUrl?: string | null;
  /** Whether this is an NFT */
  isNFT?: boolean;
  /** Token pricing information */
  price?: TokenPrice | null;
  /** Total value in USD */
  valueUSD?: number | null;
  /** Account address */
  account?: string;
  /** Metadata URI */
  metadataUri?: string | null;
}

/**
 * Portfolio summary statistics
 */
export interface PortfolioSummary {
  /** Total number of tokens */
  totalTokens: number;
  /** Number of NFTs */
  totalNFTs: number;
  /** Number of fungible tokens */
  totalFungibleTokens: number;
  /** Total portfolio value in USD */
  totalValueUSD: number;
  /** Number of tokens with pricing data */
  tokensWithPricing: number;
  /** Top 5 tokens by value */
  topTokensByValue: TokenInfo[];
  /** Largest holdings by balance */
  largestHoldings: TokenInfo[];
}

/**
 * Portfolio calculation result
 */
export interface PortfolioResult {
  /** Whether the calculation was successful */
  success: boolean;
  /** Wallet address */
  address: string;
  /** Array of all tokens */
  tokens: TokenInfo[];
  /** Portfolio summary */
  summary: PortfolioSummary;
  /** Calculation timestamp */
  lastUpdated: string;
  /** Error message if calculation failed */
  error?: string;
  /** Calculation duration in milliseconds */
  calculationTimeMs?: number;
  /** Metadata about the calculation */
  metadata: {
    /** RPC endpoint used */
    rpcEndpoint: string;
    /** Whether NFTs were included */
    includesNFTs: boolean;
    /** Whether zero balance tokens were included */
    includesZeroBalance: boolean;
    /** Number of failed token metadata fetches */
    metadataFailures: number;
    /** Number of failed price fetches */
    pricingFailures: number;
  };
}

/**
 * Price provider interface for implementing custom price sources
 */
export interface PriceProvider {
  /** Provider name */
  name: string;
  /** Get token prices for an array of mint addresses */
  getTokenPrices(mints: string[]): Promise<Map<string, TokenPrice>>;
  /** Get single token price */
  getTokenPrice(mint: string): Promise<TokenPrice | null>;
}

/**
 * Metadata provider interface for implementing custom metadata sources
 */
export interface MetadataProvider {
  /** Provider name */
  name: string;
  /** Get token metadata for a mint address */
  getTokenMetadata(mint: string, balance?: number): Promise<TokenMetadata | null>;
  /** Get multiple token metadata */
  getTokensMetadata(mints: string[]): Promise<Map<string, TokenMetadata>>;
}

/**
 * Cache interface for implementing custom caching strategies
 */
export interface CacheProvider {
  /** Get cached data */
  get<T>(key: string): Promise<T | null>;
  /** Set cached data with optional TTL */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /** Delete cached data */
  delete(key: string): Promise<void>;
  /** Clear all cached data */
  clear(): Promise<void>;
}

/**
 * Options for portfolio calculation
 */
export interface CalculatePortfolioOptions {
  /** Whether to include pricing data */
  includePricing?: boolean;
  /** Whether to include metadata */
  includeMetadata?: boolean;
  /** Whether to include NFTs */
  includeNFTs?: boolean;
  /** Whether to include zero balance tokens */
  includeZeroBalance?: boolean;
  /** Custom price provider */
  priceProvider?: PriceProvider;
  /** Custom metadata provider */
  metadataProvider?: MetadataProvider;
  /** Custom cache provider */
  cacheProvider?: CacheProvider;
  /** Maximum number of concurrent requests */
  maxConcurrency?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Error types for better error handling
 */
export enum PortfolioErrorType {
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  RPC_ERROR = 'RPC_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  METADATA_ERROR = 'METADATA_ERROR',
  PRICING_ERROR = 'PRICING_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for portfolio calculation errors
 */
export class PortfolioError extends Error {
  public readonly type: PortfolioErrorType;
  public readonly address?: string;
  public readonly mint?: string;

  constructor(
    type: PortfolioErrorType,
    message: string,
    address?: string,
    mint?: string
  ) {
    super(message);
    this.name = 'PortfolioError';
    this.type = type;
    this.address = address;
    this.mint = mint;
  }
}

/**
 * Events emitted by the PortfolioCalculator
 */
export interface PortfolioCalculatorEvents {
  'calculation:start': { address: string };
  'calculation:progress': { address: string; progress: number; total: number };
  'calculation:complete': { address: string; result: PortfolioResult };
  'calculation:error': { address: string; error: PortfolioError };
  'token:metadata:fetched': { mint: string; metadata: TokenMetadata };
  'token:metadata:failed': { mint: string; error: Error };
  'token:price:fetched': { mint: string; price: TokenPrice };
  'token:price:failed': { mint: string; error: Error };
}

// ========================================
// Transaction Types
// ========================================

/**
 * Solana transaction signature information
 */
export interface TransactionSignature {
  /** Transaction signature */
  signature: string;
  /** Block slot number */
  slot: number;
  /** Block time (Unix timestamp) */
  blockTime: number | null;
  /** Block time formatted as string */
  blockTimeFormatted: string;
  /** Transaction error (null if successful) */
  err: any;
  /** Transaction memo */
  memo?: string;
  /** Confirmation status */
  confirmationStatus?: string;
}

/**
 * Options for fetching transactions
 */
export interface GetTransactionsOptions {
  /** Maximum number of transactions to fetch (default: 100, max: 2000) */
  limit?: number;
  /** Fetch transactions before this signature (for pagination) */
  before?: string;
  /** Fetch transactions until this signature */
  until?: string;
  /** Commitment level for transaction confirmation */
  commitment?: 'finalized' | 'confirmed' | 'processed';
}

/**
 * Transaction pagination information
 */
export interface TransactionPagination {
  /** Current page number */
  page: number;
  /** Number of transactions per page */
  perPage: number;
  /** Total number of transactions */
  total: number;
  /** Whether there are more transactions available */
  hasMore: boolean;
  /** Last signature on this page (for next page pagination) */
  lastSignature?: string;
}

/**
 * Transaction summary by page
 */
export interface TransactionPageSummary {
  /** Page number */
  pageNumber: number;
  /** Filename where transactions are stored */
  filename: string;
  /** Number of transactions in this page */
  transactionCount: number;
  /** Last signature in this page */
  lastSignature: string;
  /** Last block time in this page */
  lastBlockTime: number | null;
  /** Formatted last block time */
  lastBlockTimeFormatted: string;
  /** Timestamp when page was created */
  timestamp: number;
}

/**
 * Complete transaction history summary
 */
export interface TransactionsSummary {
  /** When the transactions were last fetched */
  lastFetched: string;
  /** Total number of pages */
  totalPages: number;
  /** Total number of transactions */
  totalTransactions: number;
  /** Wallet creation date (earliest transaction) */
  walletCreationDate: string;
  /** Earliest transaction details */
  earliestTransaction: TransactionSignature | null;
  /** Summary of each page */
  pages: TransactionPageSummary[];
}

/**
 * Response for transaction history API
 */
export interface TransactionsResult {
  /** Request success status */
  success: boolean;
  /** Wallet address */
  address: string;
  /** Array of transactions */
  transactions: TransactionSignature[];
  /** Pagination information */
  pagination: TransactionPagination;
  /** Summary information */
  summary?: {
    /** Total transactions found */
    totalTransactions: number;
    /** Wallet creation date */
    walletCreationDate?: string;
    /** Earliest transaction */
    earliestTransaction?: TransactionSignature;
  };
  /** Request timestamp */
  timestamp: string;
  /** Error message if any */
  error?: string;
}

/**
 * Configuration for TransactionManager
 */
export interface TransactionManagerConfig {
  /** Solana RPC endpoint URL */
  rpcEndpoint: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum transactions to fetch per request (default: 100) */
  batchSize?: number;
  /** Maximum total transactions to fetch (default: 2000) */
  maxTransactions?: number;
  /** Custom headers for RPC requests */
  customHeaders?: Record<string, string>;
}

/**
 * Batch transactions request
 */
export interface BatchTransactionsRequest {
  /** Array of wallet addresses */
  addresses: string[];
  /** Options for fetching transactions */
  options?: GetTransactionsOptions;
}

/**
 * Batch transactions response
 */
export interface BatchTransactionsResponse {
  /** Request success status */
  success: boolean;
  /** Results for each address */
  results: {
    /** Wallet address */
    address: string;
    /** Transaction result */
    result: TransactionsResult;
  }[];
  /** Overall statistics */
  stats: {
    /** Number of successful requests */
    successful: number;
    /** Number of failed requests */
    failed: number;
    /** Total processing time */
    totalTime: number;
  };
  /** Request timestamp */
  timestamp: string;
}