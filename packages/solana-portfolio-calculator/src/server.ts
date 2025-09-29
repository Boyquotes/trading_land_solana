import express, { Request, Response } from 'express';
import { PortfolioCalculator } from './PortfolioCalculator';
import { PortfolioCalculatorConfig, PortfolioResult, PortfolioError } from './types';

/**
 * HTTP API server for the portfolio calculator
 */
export class PortfolioAPIServer {
  private app: express.Application;
  private calculator: PortfolioCalculator;
  private port: number;

  constructor(config: PortfolioCalculatorConfig, port: number = 3000) {
    this.app = express();
    this.calculator = new PortfolioCalculator(config);
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
          'POST /portfolio/batch': 'Batch portfolio calculation'
        },
        queryParameters: {
          includePricing: 'boolean - Include pricing data (default: true)',
          includeMetadata: 'boolean - Include token metadata (default: true)',
          includeNFTs: 'boolean - Include NFTs (default: true)',
          includeZeroBalance: 'boolean - Include zero balance tokens (default: false)',
          maxConcurrency: 'number - Max concurrent requests (default: 10)',
          timeout: 'number - Request timeout in ms (default: 30000)'
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