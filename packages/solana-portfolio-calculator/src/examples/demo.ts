#!/usr/bin/env tsx

import { PortfolioCalculator } from '../index';

/**
 * Quick demo showing the key features of the portfolio calculator
 */
async function quickDemo() {
  console.log('⚡ Quick Portfolio Calculator Demo\n');
  
  try {
    console.log('1️⃣ Initializing calculator...');
    const calculator = new PortfolioCalculator({
      rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      timeout: 20000,
      includeNFTs: false,        // Disable NFTs for speed
      includeZeroBalance: false  // Skip zero balance tokens
    });

    console.log('2️⃣ Checking network connectivity...');
    const health = await calculator.healthCheck();
    console.log(`   Network: ${health.healthy ? '✅ Connected' : '❌ Failed'} (${health.latency || '?'}ms)`);

    if (!health.healthy) {
      console.log('❌ Cannot proceed without network connection');
      return;
    }

    console.log('3️⃣ Calculating portfolio (fast mode)...');
    const walletAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
    
    const startTime = Date.now();
    const result = await calculator.calculatePortfolio(walletAddress, {
      includeMetadata: false,    // Skip metadata for speed
      includePricing: false,     // Skip pricing for speed  
      includeNFTs: false,        // Skip NFTs
      includeZeroBalance: false, // Skip zero balance
      maxConcurrency: 1,         // Low concurrency for stability
      timeout: 15000            // Short timeout
    });

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ Portfolio processed in ${duration}ms`);
      console.log(`📊 Results:`);
      console.log(`   • Total tokens: ${result.tokens.length}`);
      console.log(`   • Calculation time: ${result.calculationTimeMs || duration}ms`);
      
      if (result.tokens.length > 0) {
        console.log(`\n🪙 Sample tokens (first 5):`);
        result.tokens.slice(0, 5).forEach((token, i) => {
          console.log(`   ${i + 1}. ${token.symbol || 'Unknown'}: ${token.balance}`);
        });
        
        const hasBalances = result.tokens.filter(t => t.balance > 0);
        console.log(`\n💰 Tokens with balance: ${hasBalances.length}`);
      }

      console.log(`\n⚡ Performance stats:`);
      console.log(`   • Processing speed: ${(result.tokens.length / duration * 1000).toFixed(1)} tokens/sec`);
      console.log(`   • Network efficiency: ${result.metadata.metadataFailures || 0} failures`);
      
    } else {
      console.log(`❌ Portfolio calculation failed: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Demo failed:', error instanceof Error ? error.message : error);
  }

  console.log('\n🎯 Demo completed!');
  console.log('\n💡 Next steps:');
  console.log('   • Try: npm run basic (for detailed testing)');
  console.log('   • Try: npm run simple (for advanced features)');
  console.log('   • Custom RPC: SOLANA_RPC_URL="your-rpc" npm run demo');
}

// Run the demo
console.log('🚀 Starting Quick Demo\n');
quickDemo()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });