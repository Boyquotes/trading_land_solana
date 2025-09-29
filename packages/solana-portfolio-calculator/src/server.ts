import express, { Request, Response } from 'express';
import { PortfolioCalculator } from './PortfolioCalculator';
import { TransactionManager } from './TransactionManager';
import { 
  PortfolioCalculatorConfig, 
  PortfolioResult, 
  PortfolioError,
  TransactionManagerConfig,
  GetTransactionsOptions,
  BatchTransactionsRequest,
  BatchTransactionsResponse
} from './types';

/**
 * HTTP API server for the portfolio calculator
 */
export class PortfolioAPIServer {
  private app: express.Application;
  private calculator: PortfolioCalculator;
  private transactionManager: TransactionManager;
  private port: number;

  constructor(config: PortfolioCalculatorConfig, port: number = 3000) {
    this.app = express();
    this.calculator = new PortfolioCalculator(config);
    
    // Create transaction manager with the same RPC endpoint
    const transactionConfig: TransactionManagerConfig = {
      rpcEndpoint: config.rpcEndpoint,
      timeout: config.timeout,
      customHeaders: config.customHeaders
    };
    this.transactionManager = new TransactionManager(transactionConfig);
    this.port = port;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const health = await this.calculator.healthCheck();
        res.status(health.healthy ? 200 : 503).json(health);
      } catch (error) {
        res.status(500).json({
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get portfolio for an address
    this.app.get('/portfolio/:address', async (req: Request, res: Response) => {
      try {
        const { address } = req.params;
        const options = {
          includePricing: req.query.includePricing !== 'false',
          includeMetadata: req.query.includeMetadata !== 'false',
          includeNFTs: req.query.includeNFTs !== 'false',
          includeZeroBalance: req.query.includeZeroBalance === 'true',
          maxConcurrency: parseInt(req.query.maxConcurrency as string) || 10,
          timeout: parseInt(req.query.timeout as string) || 30000
        };

        const portfolio: PortfolioResult = await this.calculator.calculatePortfolio(address, options);
        
        res.json(portfolio);
      } catch (error) {
        console.error('Error calculating portfolio:', error);
        
        if (error instanceof PortfolioError) {
          const statusCode = this.getStatusCodeForError(error);
          res.status(statusCode).json({
            success: false,
            error: error.message,
            type: error.type,
            address: error.address,
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // Validate address
    this.app.get('/validate/:address', async (req: Request, res: Response) => {
      try {
        const { address } = req.params;
        const isValid = this.calculator.isValidAddress(address);
        
        res.json({
          success: true,
          address,
          isValid,
          message: isValid ? 'Valid Solana address' : 'Invalid Solana address format'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get wallet info (lightweight)
    this.app.get('/wallet-info/:address', async (req: Request, res: Response) => {
      try {
        const { address } = req.params;
        const walletInfo = await this.calculator.getWalletInfo(address);
        
        res.json({
          success: true,
          ...walletInfo,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Batch portfolio calculation
    this.app.post('/portfolio/batch', async (req: Request, res: Response) => {
      try {
        const { addresses } = req.body;
        
        if (!Array.isArray(addresses) || addresses.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'addresses must be a non-empty array',
            timestamp: new Date().toISOString()
          });
        }

        if (addresses.length > 100) {
          return res.status(400).json({
            success: false,
            error: 'Maximum 100 addresses allowed per batch request',
            timestamp: new Date().toISOString()
          });
        }

        const results = await Promise.allSettled(
          addresses.map(address => this.calculator.calculatePortfolio(address))
        );

        const portfolios = results.map((result, index) => ({
          address: addresses[index],
          success: result.status === 'fulfilled',
          data: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason.message : null
        }));

        res.json({
          success: true,
          portfolios,
          totalRequested: addresses.length,
          successful: portfolios.filter(p => p.success).length,
          failed: portfolios.filter(p => !p.success).length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Transaction endpoints

    // Get transactions for an address
    this.app.get('/transactions/:address', async (req: Request, res: Response) => {
      try {
        const { address } = req.params;
        
        // Parse query options
        const options: GetTransactionsOptions = {
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
          before: req.query.before as string,
          until: req.query.until as string,
          commitment: req.query.commitment as any
        };

        const result = await this.transactionManager.getTransactions(address, options);
        
        if (result.success) {
          res.json(result);
        } else {
          res.status(400).json(result);
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get complete transaction history for an address
    this.app.get('/transactions/:address/complete', async (req: Request, res: Response) => {
      try {
        const { address } = req.params;
        
        const options: GetTransactionsOptions = {
          commitment: req.query.commitment as any
        };

        const result = await this.transactionManager.getCompleteTransactionHistory(address, options);
        
        if (result.success) {
          res.json(result);
        } else {
          res.status(400).json(result);
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Batch transaction requests
    this.app.post('/transactions/batch', async (req: Request, res: Response) => {
      try {
        const { addresses, options }: BatchTransactionsRequest = req.body;
        
        if (!Array.isArray(addresses) || addresses.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'addresses must be a non-empty array',
            timestamp: new Date().toISOString()
          });
        }

        if (addresses.length > 50) {
          return res.status(400).json({
            success: false,
            error: 'Maximum 50 addresses allowed per batch transaction request',
            timestamp: new Date().toISOString()
          });
        }

        const startTime = Date.now();
        
        const results = await Promise.allSettled(
          addresses.map(address => this.transactionManager.getTransactions(address, options))
        );

        const transactionResults = results.map((result, index) => ({
          address: addresses[index],
          result: result.status === 'fulfilled' ? result.value : {
            success: false,
            address: addresses[index],
            transactions: [],
            pagination: { page: 1, perPage: 0, total: 0, hasMore: false },
            timestamp: new Date().toISOString(),
            error: result.status === 'rejected' ? result.reason.message : 'Unknown error'
          }
        }));

        const response: BatchTransactionsResponse = {
          success: true,
          results: transactionResults,
          stats: {
            successful: transactionResults.filter(r => r.result.success).length,
            failed: transactionResults.filter(r => !r.result.success).length,
            totalTime: Date.now() - startTime
          },
          timestamp: new Date().toISOString()
        };

        res.json(response);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Transaction health check
    this.app.get('/transactions/health', async (req: Request, res: Response) => {
      try {
        const health = await this.transactionManager.healthCheck();
        res.status(health.healthy ? 200 : 503).json(health);
      } catch (error) {
        res.status(500).json({
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // API documentation
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'Solana Portfolio Calculator API',
        version: '1.0.0',
        endpoints: {
          'GET /health': 'Health check',
          'GET /portfolio/:address': 'Calculate portfolio for address',
          'GET /validate/:address': 'Validate Solana address',
          'GET /wallet-info/:address': 'Get basic wallet information',
          'POST /portfolio/batch': 'Batch portfolio calculation',
          'GET /transactions/:address': 'Get transaction history for address',
          'GET /transactions/:address/complete': 'Get complete transaction history (up to 2000 txs)',
          'POST /transactions/batch': 'Batch transaction requests for multiple addresses',
          'GET /transactions/health': 'Transaction manager health check'
        },
        queryParameters: {
          // Portfolio endpoints
          includePricing: 'boolean - Include pricing data (default: true)',
          includeMetadata: 'boolean - Include token metadata (default: true)',
          includeNFTs: 'boolean - Include NFTs (default: true)',
          includeZeroBalance: 'boolean - Include zero balance tokens (default: false)',
          maxConcurrency: 'number - Max concurrent requests (default: 10)',
          timeout: 'number - Request timeout in ms (default: 30000)',
          // Transaction endpoints
          limit: 'number - Max transactions to fetch (default: 100, max: 1000)',
          before: 'string - Fetch transactions before this signature (pagination)',
          until: 'string - Fetch transactions until this signature',
          commitment: 'string - Commitment level (finalized, confirmed, processed)'
        },
        examples: {
          portfolio: 'GET /portfolio/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          transactions: 'GET /transactions/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?limit=50',
          completeHistory: 'GET /transactions/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/complete',
          batchTransactions: 'POST /transactions/batch with {"addresses": ["addr1", "addr2"]}'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        timestamp: new Date().toISOString()
      });
    });
  }

  private getStatusCodeForError(error: PortfolioError): number {
    switch (error.type) {
      case 'INVALID_ADDRESS':
        return 400;
      case 'TIMEOUT_ERROR':
        return 408;
      case 'RPC_ERROR':
      case 'NETWORK_ERROR':
        return 503;
      default:
        return 500;
    }
  }

  /**
   * Start the API server
   * @returns Promise that resolves when server is ready
   */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`📊 Solana Portfolio Calculator API server running on port ${this.port}`);
        console.log(`🌐 API Documentation: http://localhost:${this.port}/`);
        console.log(`❤️  Health Check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }

  /**
   * Get the Express app instance
   * @returns Express application
   */
  public getApp(): express.Application {
    return this.app;
  }
}