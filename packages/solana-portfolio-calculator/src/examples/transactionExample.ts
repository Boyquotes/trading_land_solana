/**
 * Example usage of the Transaction API endpoints
 */

import { TransactionManager, PortfolioAPIServer } from '../index.js';

// Configuration
const config = {
  rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  timeout: 30000
};

/**
 * Example 1: Using TransactionManager directly
 */
async function directTransactionExample() {
  console.log('🔄 Direct Transaction Manager Example\n');

  const transactionManager = new TransactionManager(config);

  // Example wallet address (Phantom team wallet)
  const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

  try {
    // Get latest 10 transactions
    console.log('📋 Fetching latest 10 transactions...');
    const latestResult = await transactionManager.getTransactions(address, { limit: 10 });
    
    if (latestResult.success) {
      console.log(`✅ Found ${latestResult.transactions.length} transactions`);
      console.log(`📅 Wallet creation: ${latestResult.summary?.walletCreationDate || 'Unknown'}`);
      
      // Show first 3 transactions
      latestResult.transactions.slice(0, 3).forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.signature.slice(0, 8)}... at ${tx.blockTimeFormatted}`);
      });
    }

    console.log('\n🔄 Fetching complete transaction history...');
    const completeResult = await transactionManager.getCompleteTransactionHistory(address);
    
    if (completeResult.success) {
      console.log(`✅ Complete history: ${completeResult.transactions.length} transactions`);
      console.log(`📊 Earliest transaction: ${completeResult.summary?.earliestTransaction?.blockTimeFormatted}`);
      
      // Create summary for pagination
      const summary = transactionManager.createTransactionsSummary(completeResult.transactions);
      console.log(`📄 Would create ${summary.totalPages} pages of transactions`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Example 2: Using HTTP API endpoints
 */
async function httpApiExample() {
  console.log('\n🌐 HTTP API Transaction Example\n');

  // Start the server
  const server = new PortfolioAPIServer(config, 3002);
  
  try {
    await server.start();
    console.log('🚀 Server started on port 3002');

    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    const baseUrl = 'http://localhost:3002';
    const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

    // Test transaction health endpoint
    console.log('🏥 Testing transaction health...');
    const healthResponse = await fetch(`${baseUrl}/transactions/health`);
    const health = await healthResponse.json();
    console.log(`   Health: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);

    // Test getting transactions
    console.log('📋 Testing transaction endpoint...');
    const txResponse = await fetch(`${baseUrl}/transactions/${address}?limit=5`);
    const txResult = await txResponse.json();
    
    if (txResult.success) {
      console.log(`   ✅ Found ${txResult.transactions.length} transactions`);
      console.log(`   📅 Wallet creation: ${txResult.summary?.walletCreationDate || 'Unknown'}`);
    }

    // Test complete history endpoint
    console.log('📚 Testing complete history endpoint...');
    const completeResponse = await fetch(`${baseUrl}/transactions/${address}/complete`);
    const completeResult = await completeResponse.json();
    
    if (completeResult.success) {
      console.log(`   ✅ Complete history: ${completeResult.transactions.length} transactions`);
      console.log(`   🔄 Has more: ${completeResult.pagination.hasMore}`);
    }

    // Test batch endpoint
    console.log('📦 Testing batch transactions endpoint...');
    const batchResponse = await fetch(`${baseUrl}/transactions/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses: [address],
        options: { limit: 3 }
      })
    });
    const batchResult = await batchResponse.json();
    
    if (batchResult.success) {
      console.log(`   ✅ Batch processed ${batchResult.results.length} addresses`);
      console.log(`   📊 Stats: ${batchResult.stats.successful} successful, ${batchResult.stats.failed} failed`);
    }

    console.log('\n📋 Available endpoints:');
    console.log(`   🏥 Health: GET ${baseUrl}/transactions/health`);
    console.log(`   📋 Transactions: GET ${baseUrl}/transactions/:address?limit=10`);
    console.log(`   📚 Complete History: GET ${baseUrl}/transactions/:address/complete`);
    console.log(`   📦 Batch: POST ${baseUrl}/transactions/batch`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Example 3: Demonstrating pagination
 */
async function paginationExample() {
  console.log('\n📄 Pagination Example\n');

  const transactionManager = new TransactionManager(config);
  const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

  try {
    let page = 1;
    let before: string | undefined;
    let hasMore = true;

    while (hasMore && page <= 3) { // Limit to 3 pages for demo
      console.log(`📄 Fetching page ${page}...`);
      
      const result = await transactionManager.getTransactions(address, {
        limit: 10,
        before
      });

      if (result.success) {
        console.log(`   ✅ Page ${page}: ${result.transactions.length} transactions`);
        
        if (result.transactions.length > 0) {
          const firstTx = result.transactions[0];
          const lastTx = result.transactions[result.transactions.length - 1];
          console.log(`   📅 From ${firstTx.blockTimeFormatted} to ${lastTx.blockTimeFormatted}`);
          
          // Set up for next page
          before = lastTx.signature;
          hasMore = result.pagination.hasMore;
        } else {
          hasMore = false;
        }
      } else {
        console.log(`   ❌ Error on page ${page}: ${result.error}`);
        hasMore = false;
      }

      page++;
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run examples
async function runAllExamples() {
  console.log('🚀 Solana Transaction API Examples\n');
  console.log('='.repeat(50));

  await directTransactionExample();
  await httpApiExample();
  await paginationExample();

  console.log('\n✅ All examples completed!');
  process.exit(0);
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export {
  directTransactionExample,
  httpApiExample,
  paginationExample
};