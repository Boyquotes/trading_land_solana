import { PortfolioAPIServer } from '../index';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env files
// Try to load from current directory and parent directories
const envPath = path.resolve(process.cwd(), '.env');
console.log(`🔧 Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.log(`⚠️  Warning: Could not load .env file: ${result.error.message}`);
  console.log('📍 Will use environment variables or defaults');
} else {
  console.log('✅ .env file loaded successfully');
}

// Simple server launcher
async function launchServer() {
  console.log('🚀 Launching Solana Portfolio Calculator API Server...\n');

  // Debug: Show environment variable loading
  console.log('🔍 Environment variables loaded:');
  console.log(`   - SOLANA_RPC_URL: ${process.env.SOLANA_RPC_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`   - SOLANA_RPC_URL value: "${process.env.SOLANA_RPC_URL || 'undefined'}"`);
  console.log(`   - PORT: ${process.env.PORT || 'Using default (3000)'}`);
  
  const rpcEndpoint = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const port = parseInt(process.env.PORT || '3000');
  
  console.log(`\n🎯 Final values:`);
  console.log(`   - rpcEndpoint: "${rpcEndpoint}"`);
  console.log(`   - port: ${port}\n`);
  
  const server = new PortfolioAPIServer({
    rpcEndpoint,
    timeout: 30000,
    includeNFTs: true,
    includeZeroBalance: false
  }, port); // Use port from environment or default

  try {
    await server.start();
    
    console.log('✅ Server is running successfully!\n');
    console.log(`🔗 RPC Endpoint: ${rpcEndpoint}`);
    console.log('📋 Available endpoints:');
    console.log(`   🏥 Health check:     GET  http://localhost:${port}/health`);
    console.log(`   💰 Portfolio:        GET  http://localhost:${port}/portfolio/:address`);
    console.log(`   ✅ Validate address: GET  http://localhost:${port}/validate/:address`);
    console.log(`   📊 Wallet info:      GET  http://localhost:${port}/wallet-info/:address`);
    console.log(`   📦 Batch portfolios: POST http://localhost:${port}/portfolio/batch`);
    console.log(`   🔄 Transactions:     GET  http://localhost:${port}/transactions/:address`);
    console.log(`   📖 Documentation:    GET  http://localhost:${port}/\n`);
    
    console.log('🌐 Example usage:');
    console.log(`   curl "http://localhost:${port}/health"`);
    console.log(`   curl "http://localhost:${port}/portfolio/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"`);
    console.log(`   curl "http://localhost:${port}/transactions/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?limit=5"\n`);
    
    console.log('⏹️  Press Ctrl+C to stop the server');

  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Launch the server
launchServer().catch(console.error);