/**
 * Quick server test for transaction endpoints
 */

import { PortfolioAPIServer } from './src/index.js';

const config = {
  rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  timeout: 30000
};

const server = new PortfolioAPIServer(config, 3001);

async function startServer() {
  try {
    await server.start();
    console.log('🚀 Server with transaction endpoints is running on port 3001!');
    console.log('\n📋 New Transaction Endpoints:');
    console.log('   🏥 Health: GET  http://localhost:3001/transactions/health');
    console.log('   📋 List:   GET  http://localhost:3001/transactions/:address?limit=10');
    console.log('   📚 Full:   GET  http://localhost:3001/transactions/:address/complete');
    console.log('   📦 Batch:  POST http://localhost:3001/transactions/batch');
    
    console.log('\n🌐 Try these commands:');
    console.log('   curl "http://localhost:3001/transactions/health"');
    console.log('   curl "http://localhost:3001/transactions/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?limit=3"');
    console.log('   curl "http://localhost:3001/" # Documentation with all endpoints');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();