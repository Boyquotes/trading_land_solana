/**
 * Test script to verify rate limiting functionality
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Loaded .env from: ${envPath}`);
    break;
  }
}

import { TransactionManager } from './src/TransactionManager.js';

async function testRateLimiting() {
  console.log('🧪 Testing rate limiting functionality...\n');

  // Create transaction manager with aggressive rate limiting for testing
  const transactionManager = new TransactionManager({
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    batchSize: 10, // Small batch size for testing
    rateLimitDelay: 1000, // 1 second delay between requests
    maxRetries: 2,
    retryBaseDelay: 500,
    enableRateLimiting: true,
    maxTransactions: 50 // Limit to reduce test time
  });

  // Test address (a known active wallet)
  const testAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

  try {
    console.log(`📊 Starting complete transaction history fetch for: ${testAddress}`);
    console.log(`⚙️  Configuration:`);
    console.log(`   - Batch size: 10`);
    console.log(`   - Rate limit delay: 1000ms`);
    console.log(`   - Max retries: 2`);
    console.log(`   - Max transactions: 50\n`);

    const startTime = Date.now();
    
    const result = await transactionManager.getCompleteTransactionHistory(testAddress);
    
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ Successfully fetched ${result.transactions.length} transactions`);
      console.log(`⏱️  Total time: ${duration}ms`);
      console.log(`📈 Average time per transaction: ${(duration / result.transactions.length).toFixed(2)}ms`);
      
      if (result.summary) {
        console.log(`\n📋 Summary:`);
        console.log(`   - Total transactions: ${result.summary.totalTransactions}`);
        if (result.summary.walletCreationDate) {
          console.log(`   - Wallet creation: ${result.summary.walletCreationDate}`);
        }
        if (result.summary.earliestTransaction) {
          console.log(`   - Earliest transaction: ${result.summary.earliestTransaction.signature}`);
        }
      }

      // Test that we didn't hit rate limits
      if (duration > 5000) { // If it took more than 5 seconds for 50 transactions
        console.log(`✅ Rate limiting appears to be working (took ${duration}ms for ${result.transactions.length} transactions)`);
      } else {
        console.log(`⚠️  Test completed quickly (${duration}ms) - rate limiting may not be active`);
      }

    } else {
      console.error(`❌ Failed to fetch transactions: ${result.error}`);
    }

  } catch (error) {
    console.error(`❌ Error during test:`, error);
  }

  console.log('\n🏁 Test completed');
}

// Run the test
testRateLimiting().catch(console.error);