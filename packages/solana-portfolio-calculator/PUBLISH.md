# @trading-land/solana-portfolio-calculator

## Publishing to npm

This package is ready to be published to npmjs.org. Follow these steps:

### Prerequisites

1. **Create an npm account** at [npmjs.com](https://www.npmjs.com/)
2. **Login to npm** in your terminal:
   ```bash
   npm login
   ```

### Building and Publishing

1. **Install dependencies:**
   ```bash
   cd packages/solana-portfolio-calculator
   npm install
   ```

2. **Build the package:**
   ```bash
   npm run build
   ```

3. **Run tests (optional but recommended):**
   ```bash
   npm test
   ```

4. **Publish to npm:**
   ```bash
   npm publish --access public
   ```

### After Publishing

Once published, users can install your package with:

```bash
npm install @trading-land/solana-portfolio-calculator
```

### Version Management

To publish updates:

1. **Update the version** in `package.json`:
   ```bash
   npm version patch  # for bug fixes
   npm version minor  # for new features
   npm version major  # for breaking changes
   ```

2. **Rebuild and republish:**
   ```bash
   npm run build
   npm publish
   ```

### Package Structure

```
packages/solana-portfolio-calculator/
├── src/
│   ├── types.ts                    # TypeScript interfaces
│   ├── PortfolioCalculator.ts      # Main calculator class
│   ├── server.ts                   # HTTP API server
│   ├── index.ts                    # Main export file
│   ├── utils/
│   │   ├── tokenAccounts.ts        # Token account utilities
│   │   └── metadata2.ts            # Metadata utilities
│   └── examples/
│       └── example.ts              # Usage examples
├── dist/                           # Built files (generated)
├── package.json                    # Package configuration
├── tsconfig.json                   # TypeScript configuration
├── rollup.config.js               # Build configuration
├── README.md                       # Documentation
└── LICENSE                         # MIT License
```

### Usage in Other Projects

After publishing, you can use this library in any project:

```typescript
import { PortfolioCalculator } from '@trading-land/solana-portfolio-calculator';

const calculator = new PortfolioCalculator({
  rpcEndpoint: 'https://api.mainnet-beta.solana.com'
});

const portfolio = await calculator.calculatePortfolio('WALLET_ADDRESS_HERE');
console.log(portfolio);
```

### Integration with Your Main Project

To use this library in your main project (`front` and `back` directories):

1. **Install from npm:**
   ```bash
   npm install @trading-land/solana-portfolio-calculator
   ```

2. **Replace existing portfolio code:**
   ```typescript
   // Instead of importing local utilities
   // import { getTokenAccounts, getTokenMetadata } from './utils/TokenUtils';
   
   // Use the npm package
   import { PortfolioCalculator } from '@trading-land/solana-portfolio-calculator';
   
   const calculator = new PortfolioCalculator({
     rpcEndpoint: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
   });
   
   const portfolio = await calculator.calculatePortfolio(address);
   ```

3. **Update your API endpoint:**
   ```typescript
   // In your Next.js API route
   import { PortfolioCalculator } from '@trading-land/solana-portfolio-calculator';
   
   export async function GET(request: Request, { params }: { params: { address: string } }) {
     const calculator = new PortfolioCalculator({
       rpcEndpoint: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
     });
     
     try {
       const result = await calculator.calculatePortfolio(params.address);
       return NextResponse.json(result);
     } catch (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
     }
   }
   ```

### Features Available

✅ **Complete Portfolio Calculation**
✅ **Token Metadata Fetching**  
✅ **NFT Detection and Handling**
✅ **Type-Safe TypeScript APIs**
✅ **HTTP REST API Server**
✅ **Batch Portfolio Processing**
✅ **Comprehensive Error Handling**
✅ **Caching Interface Support**
✅ **Custom Provider Support**
✅ **Performance Optimizations**

### Next Steps

1. **Publish the package** to npm following the steps above
2. **Update your main project** to use the published package
3. **Remove duplicate code** from your current project
4. **Add tests** specific to your use cases
5. **Consider adding price providers** for real-time pricing data

This creates a clean separation between your portfolio calculation logic and your main application, making it reusable across projects and easier to maintain.