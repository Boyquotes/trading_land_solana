import { PortfolioAPIServer } from '../index';

// Simple server launcher
async function launchServer() {
  console.log('🚀 Launching Solana Portfolio Calculator API Server...\n');

  const server = new PortfolioAPIServer({
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    timeout: 30000,
    includeNFTs: true,
    includeZeroBalance: false
  }, 3000); // Port 3000

  try {
    await server.start();
    
    console.log('✅ Server is running successfully!\n');
    console.log('📋 Available endpoints:');
    console.log('   🏥 Health check:     GET  http://localhost:3000/health');
    console.log('   💰 Portfolio:        GET  http://localhost:3000/portfolio/:address');
    console.log('   ✅ Validate address: GET  http://localhost:3000/validate/:address');
    console.log('   📊 Wallet info:      GET  http://localhost:3000/wallet-info/:address');
    console.log('   📦 Batch portfolios: POST http://localhost:3000/portfolio/batch');
    console.log('   📖 Documentation:    GET  http://localhost:3000/\n');
    
    console.log('🌐 Example usage:');
    console.log('   curl "http://localhost:3000/health"');
    console.log('   curl "http://localhost:3000/portfolio/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"');
    console.log('   curl "http://localhost:3000/validate/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"\n');
    
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