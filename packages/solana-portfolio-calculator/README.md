# @trading-land/solana-portfolio-calculator

A powerful TypeScript library for calculating Solana wallet portfolios with comprehensive token metadata and pricing information.

## 🚀 Features

- **Complete Portfolio Analysis**: Get detailed information about all tokens in a Solana wallet
- **Token Metadata**: Automatic fetching of token names, symbols, logos, and descriptions
- **NFT Support**: Detect and handle NFTs with specialized metadata
- **Price Integration**: Ready for price provider integration (Jupiter, CoinGecko, etc.)
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Caching Support**: Built-in interfaces for implementing custom caching strategies
- **HTTP API Server**: Optional Express.js server for REST API deployment
- **Batch Processing**: Calculate multiple portfolios simultaneously
- **Error Handling**: Comprehensive error types and graceful fallbacks

## 📦 Installation

```bash
npm install @trading-land/solana-portfolio-calculator
```

## 🔧 Quick Start

### Basic Usage

```typescript
import { PortfolioCalculator } from '@trading-land/solana-portfolio-calculator';

// Initialize the calculator
const calculator = new PortfolioCalculator({
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  timeout: 30000,
  includeNFTs: true,
  includeZeroBalance: false
});

// Calculate a portfolio
async function getPortfolio() {
  try {
    const result = await calculator.calculatePortfolio('YOUR_WALLET_ADDRESS_HERE');
    
    console.log(`Found ${result.summary.totalTokens} tokens`);
    console.log(`NFTs: ${result.summary.totalNFTs}`);
    console.log(`Fungible tokens: ${result.summary.totalFungibleTokens}`);
    
    // List all tokens
    result.tokens.forEach(token => {
      console.log(`${token.symbol}: ${token.balance} (${token.name})`);
    });
  } catch (error) {
    console.error('Error calculating portfolio:', error);
  }
}
```

### HTTP API Server

```typescript
import { PortfolioAPIServer } from '@trading-land/solana-portfolio-calculator';

// Create and start the API server
const server = new PortfolioAPIServer({
  rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
}, 3000);

server.start().then(() => {
  console.log('Portfolio API server is running!');
});
```

## 📚 API Reference

### PortfolioCalculator

#### Constructor

```typescript
new PortfolioCalculator(config: PortfolioCalculatorConfig)
```

#### Methods

- `calculatePortfolio(address: string, options?: CalculatePortfolioOptions): Promise<PortfolioResult>`
- `isValidAddress(address: string): boolean`
- `getWalletInfo(address: string): Promise<WalletInfo>`
- `healthCheck(): Promise<HealthStatus>`

### Configuration Options

```typescript
interface PortfolioCalculatorConfig {
  rpcEndpoint: string;
  timeout?: number; // Default: 30000ms
  includeNFTs?: boolean; // Default: true
  includeZeroBalance?: boolean; // Default: false
  customHeaders?: Record<string, string>;
}
```

### Calculation Options

```typescript
interface CalculatePortfolioOptions {
  includePricing?: boolean; // Default: true
  includeMetadata?: boolean; // Default: true
  includeNFTs?: boolean; // Default: true
  includeZeroBalance?: boolean; // Default: false
  maxConcurrency?: number; // Default: 10
  timeout?: number; // Default: 30000ms
  priceProvider?: PriceProvider;
  metadataProvider?: MetadataProvider;
  cacheProvider?: CacheProvider;
}
```

## 🌐 HTTP API Endpoints

When using the `PortfolioAPIServer`, the following endpoints are available:

### GET /portfolio/:address

Calculate portfolio for a specific address.

**Query Parameters:**
- `includePricing` (boolean): Include pricing data
- `includeMetadata` (boolean): Include token metadata  
- `includeNFTs` (boolean): Include NFTs
- `includeZeroBalance` (boolean): Include zero balance tokens
- `maxConcurrency` (number): Maximum concurrent requests
- `timeout` (number): Request timeout in milliseconds

**Example:**
```bash
curl "http://localhost:3000/portfolio/YOUR_WALLET_ADDRESS?includeNFTs=true"
```

### GET /validate/:address

Validate if an address is a valid Solana address.

### GET /wallet-info/:address

Get basic wallet information (lightweight).

### POST /portfolio/batch

Calculate portfolios for multiple addresses.

**Body:**
```json
{
  "addresses": ["address1", "address2", "address3"]
}
```

### GET /health

Health check endpoint.

## 🏗️ Advanced Usage

### Custom Price Provider

```typescript
import { PriceProvider, TokenPrice } from '@trading-land/solana-portfolio-calculator';

class CustomPriceProvider implements PriceProvider {
  name = 'custom-provider';

  async getTokenPrices(mints: string[]): Promise<Map<string, TokenPrice>> {
    // Implement your price fetching logic
    const prices = new Map<string, TokenPrice>();
    // ... fetch prices from your preferred source
    return prices;
  }

  async getTokenPrice(mint: string): Promise<TokenPrice | null> {
    // Implement single token price fetching
    return null;
  }
}

// Use with calculator
const result = await calculator.calculatePortfolio(address, {
  priceProvider: new CustomPriceProvider()
});
```

### Custom Metadata Provider

```typescript
import { MetadataProvider, TokenMetadata } from '@trading-land/solana-portfolio-calculator';

class CustomMetadataProvider implements MetadataProvider {
  name = 'custom-metadata';

  async getTokenMetadata(mint: string, balance?: number): Promise<TokenMetadata | null> {
    // Implement your metadata fetching logic
    return null;
  }

  async getTokensMetadata(mints: string[]): Promise<Map<string, TokenMetadata>> {
    // Implement batch metadata fetching
    return new Map();
  }
}
```

### Custom Cache Provider

```typescript
import { CacheProvider } from '@trading-land/solana-portfolio-calculator';

class RedisCacheProvider implements CacheProvider {
  async get<T>(key: string): Promise<T | null> {
    // Implement Redis get
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    // Implement Redis set with TTL
  }

  async delete(key: string): Promise<void> {
    // Implement Redis delete
  }

  async clear(): Promise<void> {
    // Implement Redis clear
  }
}
```

## 🔍 Response Format

### PortfolioResult

```typescript
interface PortfolioResult {
  success: boolean;
  address: string;
  tokens: TokenInfo[];
  summary: PortfolioSummary;
  lastUpdated: string;
  calculationTimeMs?: number;
  error?: string;
  metadata: {
    rpcEndpoint: string;
    includesNFTs: boolean;
    includesZeroBalance: boolean;
    metadataFailures: number;
    pricingFailures: number;
  };
}
```

### TokenInfo

```typescript
interface TokenInfo {
  mint: string;
  balance: number;
  rawBalance?: string;
  decimals?: number;
  name?: string | null;
  symbol?: string | null;
  logo?: string | null;
  description?: string | null;
  externalUrl?: string | null;
  isNFT?: boolean;
  price?: TokenPrice | null;
  valueUSD?: number | null;
  account?: string;
  metadataUri?: string | null;
}
```

### PortfolioSummary

```typescript
interface PortfolioSummary {
  totalTokens: number;
  totalNFTs: number;
  totalFungibleTokens: number;
  totalValueUSD: number;
  tokensWithPricing: number;
  topTokensByValue: TokenInfo[];
  largestHoldings: TokenInfo[];
}
```

## ⚡ Performance Tips

1. **Use caching**: Implement a cache provider to avoid repeated metadata fetches
2. **Limit concurrency**: Adjust `maxConcurrency` based on your RPC provider limits
3. **Filter appropriately**: Use `includeZeroBalance: false` to reduce processing time
4. **Batch requests**: Use the batch endpoint for multiple addresses
5. **Custom RPC**: Use a dedicated RPC endpoint for better performance

## 🚦 Error Handling

The library provides comprehensive error handling with specific error types:

```typescript
import { PortfolioError, PortfolioErrorType } from '@trading-land/solana-portfolio-calculator';

try {
  const result = await calculator.calculatePortfolio(address);
} catch (error) {
  if (error instanceof PortfolioError) {
    switch (error.type) {
      case PortfolioErrorType.INVALID_ADDRESS:
        console.log('Invalid Solana address provided');
        break;
      case PortfolioErrorType.RPC_ERROR:
        console.log('RPC endpoint error');
        break;
      case PortfolioErrorType.TIMEOUT_ERROR:
        console.log('Request timeout');
        break;
      // ... handle other error types
    }
  }
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## 🏗️ Development

```bash
# Clone the repository
git clone https://github.com/trading-land/solana-portfolio-calculator.git

# Install dependencies
npm install

# Build the library
npm run build

# Run in development mode
npm run dev
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📞 Support

- GitHub Issues: [Report bugs or request features](https://github.com/trading-land/solana-portfolio-calculator/issues)
- Documentation: [Full API documentation](https://trading-land.github.io/solana-portfolio-calculator)
- Email: support@trading-land.com

## 🔗 Related Projects

- [Solana Web3.js](https://github.com/solana-labs/solana-web3.js)
- [Metaplex JavaScript SDK](https://github.com/metaplex-foundation/js)
- [SPL Token Registry](https://github.com/solana-labs/token-list)

---

Made with ❤️ by [Trading Land](https://trading-land.com)