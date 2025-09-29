import { PortfolioCalculator, PortfolioAPIServer } from '../index';

// Example 1: Basic Portfolio Calculation
async function basicExample() {
  console.log('🔍 Basic Portfolio Calculation Example\n');

  const calculator = new PortfolioCalculator({
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    timeout: 30000,
    includeNFTs: true,
    includeZeroBalance: false
  });

  // Replace with a real Solana address for testing
  // Example: A well-known wallet with tokens (you can use any real address)
  const testAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'; // Phantom wallet example
  
  // Or use an environment variable for testing
  // const testAddress = process.env.TEST_WALLET_ADDRESS || '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

  try {
    console.log(`Calculating portfolio for: ${testAddress}`);
    
    const result = await calculator.calculatePortfolio(testAddress);
    
    console.log('✅ Portfolio calculation successful!');
    console.log(`📊 Summary:`);
    console.log(`   Total tokens: ${result.summary.totalTokens}`);
    console.log(`   NFTs: ${result.summary.totalNFTs}`);
    console.log(`   Fungible tokens: ${result.summary.totalFungibleTokens}`);
    console.log(`   Total value: $${result.summary.totalValueUSD}`);
    console.log(`   Calculation time: ${result.calculationTimeMs}ms`);
    
    console.log('\\n🪙 Top 5 tokens:');
    result.tokens.slice(0, 5).forEach((token, index) => {
      console.log(`   ${index + 1}. ${token.symbol || 'Unknown'}: ${token.balance} ${token.name ? `(${token.name})` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error calculating portfolio:', error);
  }

  console.log('\\n' + '='.repeat(60) + '\\n');
}

// Example 2: Wallet Validation
async function validationExample() {
  console.log('✅ Address Validation Example\\n');

  const calculator = new PortfolioCalculator({
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  });

  const addresses = [
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Valid Phantom wallet
    'InvalidAddress123', // Invalid format
    'DQyrAcCrDXQ8NNBaUP6HDZfhCYT3xwR3GjVqAGVWXk4c'  // Another valid address
  ];

  for (const address of addresses) {
    const isValid = calculator.isValidAddress(address);
    console.log(`📍 ${address.slice(0, 20)}...`);
    console.log(`   Valid: ${isValid ? '✅' : '❌'}`);
    
    if (isValid) {
      try {
        const walletInfo = await calculator.getWalletInfo(address);
        console.log(`   Token count: ${walletInfo.tokenCount}`);
      } catch (error) {
        console.log(`   Error fetching wallet info: ${error}`);
      }
    }
    console.log('');
  }

  console.log('='.repeat(60) + '\\n');
}

// Example 3: HTTP API Server
async function serverExample() {
  console.log('🌐 HTTP API Server Example\\n');

  const server = new PortfolioAPIServer({
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    timeout: 30000
  }, 3001);

  try {
    await server.start();
    console.log('🚀 Server started successfully!');
    console.log('📋 Available endpoints:');
    console.log('   GET  /health');
    console.log('   GET  /portfolio/:address');
    console.log('   GET  /validate/:address');
    console.log('   GET  /wallet-info/:address');
    console.log('   POST /portfolio/batch');
    console.log('\\n🌍 Try: curl http://localhost:3001/health');
    
    // Keep the server running for demonstration
    console.log('\\n⏳ Server will run for 30 seconds for testing...');
    
    setTimeout(() => {
      console.log('⏹️  Stopping server...');
      process.exit(0);
    }, 30000);

  } catch (error) {
    console.error('❌ Error starting server:', error);
  }
}

// Example 4: Advanced Options
async function advancedExample() {
  console.log('⚙️  Advanced Options Example\\n');

  const calculator = new PortfolioCalculator({
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    timeout: 60000,
    includeNFTs: true,
    includeZeroBalance: true,
    customHeaders: {
      'User-Agent': 'Portfolio-Calculator-Example/1.0.0'
    }
  });

  const testAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'; // Replace with real address

  try {
    const result = await calculator.calculatePortfolio(testAddress, {
      includePricing: false, // Skip pricing for faster calculation
      includeMetadata: true,
      includeNFTs: false,    // Skip NFTs
      includeZeroBalance: true, // Include zero balance tokens
      maxConcurrency: 5,     // Limit concurrent requests
      timeout: 45000
    });

    console.log('✅ Advanced calculation completed!');
    console.log(`📊 Found ${result.tokens.length} tokens (including zero balance)`);
    console.log(`🔧 Metadata failures: ${result.metadata.metadataFailures}`);
    console.log(`💰 Pricing failures: ${result.metadata.pricingFailures}`);

    // Show tokens with zero balance
    const zeroBalanceTokens = result.tokens.filter(t => t.balance === 0);
    console.log(`\\n🔍 Zero balance tokens: ${zeroBalanceTokens.length}`);
    
  } catch (error) {
    console.error('❌ Error in advanced calculation:', error);
  }

  console.log('\\n' + '='.repeat(60) + '\\n');
}

// Example 5: Health Check
async function healthCheckExample() {
  console.log('❤️  Health Check Example\\n');

  const calculator = new PortfolioCalculator({
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  });

  try {
    const health = await calculator.healthCheck();
    
    console.log(`Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`RPC Endpoint: ${health.rpcEndpoint}`);
    console.log(`Timestamp: ${health.timestamp}`);
    if (health.latency) {
      console.log(`Latency: ${health.latency}ms`);
    }

  } catch (error) {
    console.error('❌ Health check failed:', error);
  }

  console.log('\\n' + '='.repeat(60) + '\\n');
}

// Main execution
async function runExamples() {
  console.log('🎯 Solana Portfolio Calculator - Examples\\n');
  console.log('📝 Note: Replace demo addresses with real Solana addresses for testing\\n');

  // Check if we have a custom RPC URL
  if (process.env.SOLANA_RPC_URL) {
    console.log(`🔗 Using custom RPC: ${process.env.SOLANA_RPC_URL}\\n`);
  } else {
    console.log('🔗 Using default RPC (public endpoint may be slow)\\n');
  }

  await healthCheckExample();
  
  // Uncomment the examples you want to run
  await validationExample();
  await basicExample();
  // await advancedExample();
  
  // Server example (runs for 30 seconds)
  if (process.argv.includes('--server')) {
    await serverExample();
  } else {
    console.log('💡 Tip: Run with --server flag to test the HTTP API server');
    console.log('   Example: npm run dev -- --server\\n');
  }

  console.log('✨ Examples completed!');
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run examples
runExamples().catch(console.error);