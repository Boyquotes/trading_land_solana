/**
 * Transaction Manager for Solana Portfolio Calculator
 * Handles fetching and managing wallet transaction history
 */

import { Connection, PublicKey, ConfirmedSignatureInfo } from '@solana/web3.js';
import {
  TransactionManagerConfig,
  TransactionSignature,
  GetTransactionsOptions,
  TransactionsResult,
  TransactionPagination,
  TransactionsSummary,
  TransactionPageSummary,
  PortfolioError,
  PortfolioErrorType
} from './types.js';

/**
 * TransactionManager handles fetching and processing Solana wallet transaction history
 */
export class TransactionManager {
  private connection: Connection;
  private config: TransactionManagerConfig;

  constructor(config: TransactionManagerConfig) {
    this.config = {
      timeout: 30000,
      batchSize: 100,
      maxTransactions: 2000,
      rateLimitDelay: 500,
      maxRetries: 3,
      retryBaseDelay: 1000,
      enableRateLimiting: true,
      ...config
    };

    this.connection = new Connection(this.config.rpcEndpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: this.config.timeout,
      httpHeaders: this.config.customHeaders
    });
  }

  /**
   * Validates if the provided string is a valid Solana address
   * @param address - The address string to validate
   * @returns boolean indicating if the address is valid
   */
  public isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sleep for a specified amount of time
   * @param ms - Milliseconds to sleep
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is a rate limit error (429)
   * @param error - The error to check
   */
  private isRateLimitError(error: any): boolean {
    if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
      return true;
    }
    if (error?.code === 429 || error?.status === 429) {
      return true;
    }
    if (error?.response?.status === 429) {
      return true;
    }
    return false;
  }

  /**
   * Make a rate-limited RPC call with retry logic
   * @param fn - Function to call
   * @param retryCount - Current retry count
   */
  private async makeRateLimitedCall<T>(
    fn: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      if (this.isRateLimitError(error) && retryCount < this.config.maxRetries!) {
        const delay = this.config.retryBaseDelay! * Math.pow(2, retryCount);
        console.log(`[TransactionManager] Rate limited (429). Retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`);
        await this.sleep(delay);
        return this.makeRateLimitedCall(fn, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Get transaction history for a wallet address
   * @param address - The Solana wallet address
   * @param options - Options for fetching transactions
   * @returns Promise<TransactionsResult>
   */
  public async getTransactions(
    address: string,
    options: GetTransactionsOptions = {}
  ): Promise<TransactionsResult> {
    const startTime = Date.now();

    try {
      // Validate address
      if (!this.isValidAddress(address)) {
        throw new PortfolioError(
          PortfolioErrorType.INVALID_ADDRESS,
          `Invalid Solana address format: ${address}`,
          address
        );
      }

      console.log(`[TransactionManager] Fetching transactions for address: ${address}`);

      const publicKey = new PublicKey(address);
      const limit = Math.min(options.limit || this.config.batchSize!, 1000);
      
      // Prepare options for getSignaturesForAddress
      const fetchOptions: any = {
        limit,
        commitment: options.commitment || 'confirmed'
      };

      if (options.before) {
        fetchOptions.before = options.before;
      }

      if (options.until) {
        fetchOptions.until = options.until;
      }

      // Fetch transaction signatures with rate limiting
      const signatures = await this.makeRateLimitedCall(async () => {
        return await this.connection.getSignaturesForAddress(publicKey, fetchOptions);
      });
      
      console.log(`[TransactionManager] Found ${signatures.length} transaction signatures`);

      // Convert to our TransactionSignature format
      const transactions: TransactionSignature[] = signatures.map((sig: ConfirmedSignatureInfo) => ({
        signature: sig.signature,
        slot: sig.slot,
        blockTime: sig.blockTime || null,
        blockTimeFormatted: sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'unknown',
        err: sig.err,
        memo: sig.memo || undefined,
        confirmationStatus: sig.confirmationStatus
      }));

      // Calculate pagination info
      const pagination: TransactionPagination = {
        page: 1,
        perPage: limit,
        total: transactions.length,
        hasMore: signatures.length === limit,
        lastSignature: transactions.length > 0 ? transactions[transactions.length - 1].signature : undefined
      };

      // Calculate summary
      const summary = this.calculateTransactionSummary(transactions);

      const result: TransactionsResult = {
        success: true,
        address,
        transactions,
        pagination,
        summary,
        timestamp: new Date().toISOString()
      };

      const duration = Date.now() - startTime;
      console.log(`[TransactionManager] Successfully processed ${transactions.length} transactions for ${address} in ${duration}ms`);

      return result;

    } catch (error) {
      console.error(`[TransactionManager] Error fetching transactions for ${address}:`, error);

      if (error instanceof PortfolioError) {
        throw error;
      }

      const result: TransactionsResult = {
        success: false,
        address,
        transactions: [],
        pagination: {
          page: 1,
          perPage: 0,
          total: 0,
          hasMore: false
        },
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };

      return result;
    }
  }

  /**
   * Get complete transaction history for a wallet (up to maxTransactions)
   * @param address - The Solana wallet address
   * @param options - Options for fetching transactions
   * @returns Promise<TransactionsResult>
   */
  public async getCompleteTransactionHistory(
    address: string,
    options: GetTransactionsOptions = {}
  ): Promise<TransactionsResult> {
    const startTime = Date.now();

    try {
      if (!this.isValidAddress(address)) {
        throw new PortfolioError(
          PortfolioErrorType.INVALID_ADDRESS,
          `Invalid Solana address format: ${address}`,
          address
        );
      }

      console.log(`[TransactionManager] Fetching complete transaction history for address: ${address}`);

      const publicKey = new PublicKey(address);
      const allTransactions: TransactionSignature[] = [];
      let lastSignature: string | undefined = options.before;
      let hasMore = true;
      let pageNumber = 1;

      // Fetch transactions in batches with rate limiting
      while (allTransactions.length < this.config.maxTransactions! && hasMore) {
        const fetchOptions: any = {
          limit: this.config.batchSize,
          commitment: options.commitment || 'confirmed'
        };

        if (lastSignature) {
          fetchOptions.before = lastSignature;
        }

        console.log(`[TransactionManager] Fetching page ${pageNumber} (batch size: ${this.config.batchSize})`);

        const signatures = await this.makeRateLimitedCall(async () => {
          return await this.connection.getSignaturesForAddress(publicKey, fetchOptions);
        });
        
        if (signatures.length < this.config.batchSize!) {
          hasMore = false;
        }

        // Convert to our format
        const batchTransactions: TransactionSignature[] = signatures.map((sig: ConfirmedSignatureInfo) => ({
          signature: sig.signature,
          slot: sig.slot,
          blockTime: sig.blockTime || null,
          blockTimeFormatted: sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'unknown',
          err: sig.err,
          memo: sig.memo || undefined,
          confirmationStatus: sig.confirmationStatus
        }));

        allTransactions.push(...batchTransactions);

        console.log(`[TransactionManager] Fetched page ${pageNumber}: ${batchTransactions.length} transactions (total: ${allTransactions.length})`);

        if (hasMore && signatures.length > 0) {
          lastSignature = signatures[signatures.length - 1].signature;
        }

        pageNumber++;

        // Add rate limiting delay between requests (except for the last request)
        if (this.config.enableRateLimiting && hasMore && allTransactions.length < this.config.maxTransactions!) {
          console.log(`[TransactionManager] Rate limiting: waiting ${this.config.rateLimitDelay}ms before next batch`);
          await this.sleep(this.config.rateLimitDelay!);
        }
      }

      // Calculate summary
      const summary = this.calculateTransactionSummary(allTransactions);

      // Calculate pagination
      const pagination: TransactionPagination = {
        page: 1,
        perPage: allTransactions.length,
        total: allTransactions.length,
        hasMore: hasMore && allTransactions.length >= this.config.maxTransactions!,
        lastSignature: allTransactions.length > 0 ? allTransactions[allTransactions.length - 1].signature : undefined
      };

      const result: TransactionsResult = {
        success: true,
        address,
        transactions: allTransactions,
        pagination,
        summary,
        timestamp: new Date().toISOString()
      };

      const duration = Date.now() - startTime;
      console.log(`[TransactionManager] Successfully fetched complete history: ${allTransactions.length} transactions for ${address} in ${duration}ms`);

      return result;

    } catch (error) {
      console.error(`[TransactionManager] Error fetching complete transaction history for ${address}:`, error);

      if (error instanceof PortfolioError) {
        throw error;
      }

      const result: TransactionsResult = {
        success: false,
        address,
        transactions: [],
        pagination: {
          page: 1,
          perPage: 0,
          total: 0,
          hasMore: false
        },
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };

      return result;
    }
  }

  /**
   * Calculate summary information from transactions
   * @param transactions - Array of transactions
   * @returns Summary object
   */
  private calculateTransactionSummary(transactions: TransactionSignature[]) {
    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        walletCreationDate: undefined,
        earliestTransaction: undefined
      };
    }

    // Find earliest transaction (wallet creation)
    let earliestTransaction: TransactionSignature | undefined;
    
    for (const tx of transactions) {
      if (tx.blockTime && (!earliestTransaction || tx.blockTime < earliestTransaction.blockTime!)) {
        earliestTransaction = tx;
      }
    }

    return {
      totalTransactions: transactions.length,
      walletCreationDate: earliestTransaction?.blockTimeFormatted,
      earliestTransaction
    };
  }

  /**
   * Create a detailed summary for paginated transaction storage
   * @param transactions - All transactions
   * @param pageSize - Number of transactions per page
   * @returns TransactionsSummary
   */
  public createTransactionsSummary(
    transactions: TransactionSignature[],
    pageSize: number = 100
  ): TransactionsSummary {
    const totalPages = Math.ceil(transactions.length / pageSize);
    const pages: TransactionPageSummary[] = [];

    // Create page summaries
    for (let i = 0; i < totalPages; i++) {
      const startIndex = i * pageSize;
      const endIndex = Math.min(startIndex + pageSize, transactions.length);
      const pageTransactions = transactions.slice(startIndex, endIndex);
      
      if (pageTransactions.length > 0) {
        const lastTransaction = pageTransactions[pageTransactions.length - 1];
        
        pages.push({
          pageNumber: i + 1,
          filename: `transactions_page_${i + 1}.json`,
          transactionCount: pageTransactions.length,
          lastSignature: lastTransaction.signature,
          lastBlockTime: lastTransaction.blockTime,
          lastBlockTimeFormatted: lastTransaction.blockTimeFormatted,
          timestamp: Date.now()
        });
      }
    }

    // Find earliest transaction
    const summary = this.calculateTransactionSummary(transactions);

    return {
      lastFetched: new Date().toISOString(),
      totalPages,
      totalTransactions: transactions.length,
      walletCreationDate: summary.walletCreationDate || 'Unknown',
      earliestTransaction: summary.earliestTransaction || null,
      pages
    };
  }

  /**
   * Health check for the transaction manager
   * @returns Health status
   */
  public async healthCheck(): Promise<{ healthy: boolean; message: string; timestamp: string }> {
    try {
      // Test connection by getting latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      
      return {
        healthy: true,
        message: `Transaction manager is healthy. Latest blockhash: ${blockhash.slice(0, 8)}...`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Transaction manager is unhealthy: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}