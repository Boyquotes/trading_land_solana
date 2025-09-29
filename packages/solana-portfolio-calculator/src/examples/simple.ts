import { PortfolioCalculator } from '../index';

// Simple example without Express server dependency
async function simpleExample() {
  console.log('🎯 Simple Solana Portfolio Calculator Example\n');

  try {
    // Initialize the calculator
    const calculator = new PortfolioCalculator({
      rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      timeout: 30000,
      includeNFTs: true,
      includeZeroBalance: false
    });

    console.log('1️⃣ Testing Health Check...');
    const health = await calculator.healthCheck();
    console.log(`   Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`   RPC: ${health.rpcEndpoint}`);
    if (health.latency) {
      console.log(`   Latency: ${health.latency}ms`);
    }
    console.log('');

    console.log('2️⃣ Testing Address Validation...');
    const testAddresses = [
      '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Valid
      'DQyrAcCrDXQ8NNBaUP6HDZfhCYT3xwR3GjVqAGVWXk4c', // Valid
      'InvalidAddress123' // Invalid
    ];

    for (const address of testAddresses) {
      const isValid = calculator.isValidAddress(address);
      console.log(`   📍 ${address.slice(0, 20)}... - ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }
    console.log('');

    console.log('3️⃣ Testing Portfolio Calculation...');
    // Use a well-known address with tokens
    const walletAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
    
    console.log(`   Calculating portfolio for: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`);
    const startTime = Date.now();
    
    const portfolio = await calculator.calculatePortfolio(walletAddress, {
      includeMetadata: true,
      includePricing: false, // Skip pricing for faster results
      includeNFTs: true,
      includeZeroBalance: false,
      maxConcurrency: 5
    });

    const calculationTime = Date.now() - startTime;

    if (portfolio.success) {
      console.log('   ✅ Portfolio calculation successful!');
      console.log(`   📊 Summary:`);
      console.log(`      Total tokens: ${portfolio.summary.totalTokens}`);
      console.log(`      NFTs: ${portfolio.summary.totalNFTs}`);
      console.log(`      Fungible tokens: ${portfolio.summary.totalFungibleTokens}`);
      console.log(`      Calculation time: ${calculationTime}ms`);
      
      if (portfolio.tokens.length > 0) {
        console.log(`   🪙 Top 5 tokens:`);
        portfolio.tokens.slice(0, 5).forEach((token, index) => {
          const displayName = token.name || token.symbol || 'Unknown';
          console.log(`      ${index + 1}. ${token.symbol || 'UNK'}: ${token.balance} (${displayName})`);
        });
      } else {
        console.log('   📭 No tokens found in this wallet');
      }

      console.log(`   🔧 Metadata failures: ${portfolio.metadata.metadataFailures}`);
      console.log(`   💰 Pricing failures: ${portfolio.metadata.pricingFailures}`);
    } else {
      console.log(`   ❌ Portfolio calculation failed: ${portfolio.error}`);
    }

  } catch (error) {
    console.error('❌ Error running example:', error);
    
    if (error instanceof Error) {
      console.error('   Error details:', error.message);
      
      // Check for common issues
      if (error.message.includes('fetch')) {
        console.log('💡 Tip: This might be a network issue. Try using a different RPC endpoint.');
      } else if (error.message.includes('timeout')) {
        console.log('💡 Tip: The request timed out. Try increasing the timeout value.');
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Example completed!');
  console.log('💡 To test with your own wallet, replace the address in the code.');
  console.log('🔗 For custom RPC: SOLANA_RPC_URL="your-rpc" npm run simple');
}

// Advanced example with more options
async function advancedExample() {
  console.log('⚙️ Advanced Portfolio Calculator Example\n');

  const calculator = new PortfolioCalculator({
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    timeout: 60000,
    includeNFTs: true,
    includeZeroBalance: true,
    customHeaders: {
      'User-Agent': 'Portfolio-Calculator-Example/1.0.0'
    }
  });

  try {
    const walletAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
    
    console.log('🔍 Advanced calculation with all options...');
    const result = await calculator.calculatePortfolio(walletAddress, {
      includePricing: false,     // Skip pricing for speed
      includeMetadata: true,     // Include metadata
      includeNFTs: true,         // Include NFTs
      includeZeroBalance: true,  // Include zero balance tokens
      maxConcurrency: 3,         // Limit concurrent requests
      timeout: 45000            // Custom timeout
    });

    if (result.success) {
      console.log('✅ Advanced calculation completed!');
      console.log(`📊 Detailed Results:`);
      console.log(`   All tokens found: ${result.tokens.length}`);
      console.log(`   NFTs: ${result.summary.totalNFTs}`);
      console.log(`   Fungible tokens: ${result.summary.totalFungibleTokens}`);
      console.log(`   Zero balance tokens: ${result.tokens.filter(t => t.balance === 0).length}`);
      console.log(`   Metadata failures: ${result.metadata.metadataFailures}`);
      console.log(`   Processing time: ${result.calculationTimeMs}ms`);

      // Show breakdown by type
      const nfts = result.tokens.filter(t => t.isNFT);
      const fungibleTokens = result.tokens.filter(t => !t.isNFT && t.balance > 0);
      const zeroBalanceTokens = result.tokens.filter(t => t.balance === 0);

      if (nfts.length > 0) {
        console.log(`\n🖼️  NFTs found: ${nfts.length}`);
        nfts.slice(0, 3).forEach((nft, index) => {
          console.log(`   ${index + 1}. ${nft.name || nft.symbol || 'Unknown NFT'}`);
        });
      }

      if (fungibleTokens.length > 0) {
        console.log(`\n🪙 Fungible tokens: ${fungibleTokens.length}`);
        fungibleTokens.slice(0, 5).forEach((token, index) => {
          console.log(`   ${index + 1}. ${token.symbol || 'UNK'}: ${token.balance}`);
        });
      }

      if (zeroBalanceTokens.length > 0) {
        console.log(`\n🔍 Zero balance tokens: ${zeroBalanceTokens.length}`);
      }
    }

  } catch (error) {
    console.error('❌ Advanced example failed:', error);
  }

  console.log('\n' + '='.repeat(60));
}

// Main execution
async function main() {
  console.log('🚀 Starting Solana Portfolio Calculator Examples\n');

  // Check which example to run
  const args = process.argv.slice(2);
  
  if (args.includes('--advanced')) {
    await advancedExample();
  } else {
    await simpleExample();
  }

  if (args.includes('--both')) {
    console.log('\n🔄 Running advanced example...\n');
    await advancedExample();
  }

  console.log('\n💡 Usage tips:');
  console.log('   npm run simple              # Run simple example');
  console.log('   npm run simple -- --advanced # Run advanced example');
  console.log('   npm run simple -- --both     # Run both examples');
  console.log('   SOLANA_RPC_URL="your-rpc" npm run simple # Custom RPC');
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the examples
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});