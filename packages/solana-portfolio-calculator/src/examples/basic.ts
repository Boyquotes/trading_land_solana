#!/usr/bin/env tsx

import { PortfolioCalculator } from '../index';

/**
 * Basic example for testing the calculator core functionality
 * No dependencies on external servers - just the calculator
 */
async function basicCalculatorTest() {
  console.log('🔧 Basic Portfolio Calculator Test\n');
  
  try {
    // 1. Test calculator creation
    console.log('1️⃣ Creating calculator instance...');
    const calculator = new PortfolioCalculator({
      rpcEndpoint: 'https://api.mainnet-beta.solana.com',
      timeout: 15000,
      includeNFTs: false,  // Disable NFTs for faster testing
      includeZeroBalance: false
    });
    console.log('   ✅ Calculator created successfully');

    // 2. Test address validation
    console.log('\n2️⃣ Testing address validation...');
    const validAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
    const invalidAddress = 'invalid_address_123';
    
    console.log(`   Valid address: ${calculator.isValidAddress(validAddress) ? '✅' : '❌'}`);
    console.log(`   Invalid address: ${calculator.isValidAddress(invalidAddress) ? '❌' : '✅'}`);

    // 3. Test health check (network connectivity)
    console.log('\n3️⃣ Testing network connection...');
    const startTime = Date.now();
    const health = await calculator.healthCheck();
    const latency = Date.now() - startTime;
    
    if (health.healthy) {
      console.log(`   ✅ Network connection OK (${latency}ms)`);
      console.log(`   RPC: ${health.rpcEndpoint}`);
    } else {
      console.log(`   ❌ Network connection failed`);
      console.log(`   Latency: ${health.latency || 'unknown'}ms`);
      return; // Stop here if network is down
    }

    // 4. Test basic portfolio calculation
    console.log('\n4️⃣ Testing portfolio calculation...');
    console.log(`   Address: ${validAddress.slice(0, 8)}...${validAddress.slice(-8)}`);
    
    const portfolioStartTime = Date.now();
    const result = await calculator.calculatePortfolio(validAddress, {
      includeMetadata: false, // Skip metadata for speed
      includePricing: false,  // Skip pricing for speed
      includeNFTs: false,     // Skip NFTs for speed
      includeZeroBalance: false,
      maxConcurrency: 2,      // Low concurrency for stability
      timeout: 10000          // Short timeout
    });
    
    const calculationTime = Date.now() - portfolioStartTime;

    if (result.success) {
      console.log(`   ✅ Portfolio calculated in ${calculationTime}ms`);
      console.log(`   📊 Results:`);
      console.log(`      Total tokens: ${result.summary.totalTokens}`);
      console.log(`      Fungible tokens: ${result.summary.totalFungibleTokens}`);
      console.log(`      NFTs: ${result.summary.totalNFTs}`);
      
      if (result.tokens.length > 0) {
        console.log(`   🪙 First few tokens:`);
        result.tokens.slice(0, 3).forEach((token, index) => {
          const symbol = token.symbol || 'Unknown';
          const balance = token.balance;
          console.log(`      ${index + 1}. ${symbol}: ${balance}`);
        });
      } else {
        console.log('   📭 No tokens found');
      }
      
      console.log(`   ⚡ Performance:`);
      console.log(`      Calculation time: ${result.calculationTimeMs || calculationTime}ms`);
      console.log(`      Metadata failures: ${result.metadata.metadataFailures || 0}`);
      
    } else {
      console.log(`   ❌ Portfolio calculation failed`);
      console.log(`   Error: ${result.error}`);
    }

    console.log('\n✨ Basic test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      
      // Common error diagnostics
      if (error.message.includes('fetch') || error.message.includes('network')) {
        console.log('\n💡 Diagnosis: Network connectivity issue');
        console.log('   - Check your internet connection');
        console.log('   - Try a different RPC endpoint');
        console.log('   - Verify firewall settings');
      } else if (error.message.includes('timeout')) {
        console.log('\n💡 Diagnosis: Request timeout');
        console.log('   - The network request took too long');
        console.log('   - Try increasing the timeout value');
        console.log('   - Use a faster RPC endpoint');
      } else if (error.message.includes('invalid')) {
        console.log('\n💡 Diagnosis: Invalid data or configuration');
        console.log('   - Check the wallet address format');
        console.log('   - Verify RPC endpoint URL');
      }
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   1. Make sure you have internet connection');
    console.log('   2. Try running: SOLANA_RPC_URL="https://api.devnet.solana.com" npm run basic');
    console.log('   3. Check if the Solana network is operational');
    
    process.exit(1);
  }
}

// Simple CLI interface
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('🔧 Basic Portfolio Calculator Test');
  console.log('');
  console.log('Usage:');
  console.log('  npm run basic                    # Run basic test');
  console.log('  npm run basic -- --help          # Show this help');
  console.log('');
  console.log('Environment Variables:');
  console.log('  SOLANA_RPC_URL                   # Custom RPC endpoint');
  console.log('');
  console.log('Examples:');
  console.log('  npm run basic');
  console.log('  SOLANA_RPC_URL="https://api.devnet.solana.com" npm run basic');
  process.exit(0);
}

// Run the test
console.log('🚀 Starting Basic Portfolio Calculator Test');
console.log('⏱️  This test should complete in under 30 seconds\n');

basicCalculatorTest()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });