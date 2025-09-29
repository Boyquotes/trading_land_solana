#!/usr/bin/env node

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

async function testAPIServer() {
  console.log('\n🌐 Testing API Server...\n');

  const server = new PortfolioAPIServer(config, 3002);
  
  try {
    await server.start();
    console.log('🚀 Server started on port 3002\n');

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    const baseUrl = 'http://localhost:3002';

    // Test transaction health endpoint
    console.log('🏥 Testing /transactions/health...');
    const healthResponse = await fetch(`${baseUrl}/transactions/health`);
    const health = await healthResponse.json();
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Health: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);

    // Test transaction endpoint
    console.log('📋 Testing /transactions/:address...');
    const txResponse = await fetch(`${baseUrl}/transactions/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?limit=3`);
    const txResult = await txResponse.json();
    console.log(`   Status: ${txResponse.status}`);
    
    if (txResult.success) {
      console.log(`   ✅ Found ${txResult.transactions.length} transactions`);
      console.log(`   📅 Wallet creation: ${txResult.summary?.walletCreationDate || 'Unknown'}`);
    } else {
      console.log(`   ❌ Error: ${txResult.error}`);
    }

    // Test documentation endpoint
    console.log('\n📖 Testing documentation endpoint...');
    const docResponse = await fetch(`${baseUrl}/`);
    const doc = await docResponse.json();
    console.log(`   Status: ${docResponse.status}`);
    console.log(`   Endpoints available: ${Object.keys(doc.endpoints || {}).length}`);
    
    // Check if transaction endpoints are documented
    const hasTransactionEndpoints = Object.keys(doc.endpoints || {}).some(endpoint => 
      endpoint.includes('transactions')
    );
    console.log(`   Transaction endpoints documented: ${hasTransactionEndpoints ? '✅ Yes' : '❌ No'}`);

    console.log('\n✅ API Server test completed!');
    return true;

  } catch (error) {
    console.error('❌ API Server test failed:', error);
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

  // Test API Server
  success = await testAPIServer() && success;

  console.log('\n' + '='.repeat(50));
  console.log(success ? '✅ All tests passed!' : '❌ Some tests failed!');
  
  process.exit(success ? 0 : 1);
}

runTests().catch(console.error);