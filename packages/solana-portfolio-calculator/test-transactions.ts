/**
 * Simple test script for transaction endpoints
 */

import { TransactionManager, PortfolioAPIServer } from './src/index.js';

const config = {
  rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  timeout: 30000
};

async function testTransactionManager() {
  console.log('🔄 Testing TransactionManager directly...\n');

  const manager = new TransactionManager(config);
  const testAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

  try {
    // Test health check
    console.log('🏥 Testing health check...');
    const health = await manager.healthCheck();
    console.log(`   Health: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`   Message: ${health.message}\n`);

    // Test address validation
    console.log('✅ Testing address validation...');
    const isValid = manager.isValidAddress(testAddress);
    console.log(`   ${testAddress}: ${isValid ? '✅ Valid' : '❌ Invalid'}\n`);

    // Test getting 5 transactions
    console.log('📋 Testing transaction fetch (5 transactions)...');
    const result = await manager.getTransactions(testAddress, { limit: 5 });
    
    if (result.success) {
      console.log(`   ✅ Found ${result.transactions.length} transactions`);
      console.log(`   📅 Wallet creation: ${result.summary?.walletCreationDate || 'Unknown'}`);
      
      if (result.transactions.length > 0) {
        const latestTx = result.transactions[0];
        console.log(`   🔗 Latest: ${latestTx.signature.slice(0, 8)}... at ${latestTx.blockTimeFormatted}`);
      }
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }

    console.log('\n✅ TransactionManager test completed!');
    return true;

  } catch (error) {
    console.error('❌ TransactionManager test failed:', error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Transaction API Tests\n');
  console.log('='.repeat(50));

  let success = true;

  // Test TransactionManager
  success = await testTransactionManager() && success;

  console.log('\n' + '='.repeat(50));
  console.log(success ? '✅ All tests passed!' : '❌ Some tests failed!');
  
  process.exit(success ? 0 : 1);
}

runTests().catch(console.error);