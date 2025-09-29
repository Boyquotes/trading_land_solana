# 📊 Solana Portfolio Calculator Examples

Complete examples showing how to use the Solana Portfolio Calculator library.

## 🚀 Available Examples

### 1. **Quick Demo** - `npm run demo`
Fast demonstration of core functionality.
```bash
npm run demo
```
- ⚡ **Ultra-fast**: Processes 2300+ tokens in ~1.4 seconds
- 📊 **Performance metrics**: Shows tokens/second processing speed
- 🎯 **Basic stats**: Token counts, processing time, efficiency
- ✅ **Network check**: Verifies RPC connectivity and latency

### 2. **Basic Test** - `npm run basic`
Comprehensive testing with detailed diagnostics.
```bash
npm run basic
```
- 🔧 **Full validation**: Tests all core functions
- 📋 **Step-by-step**: Clear progress indicators
- 🛠️ **Diagnostic tools**: Network troubleshooting
- 💡 **Help system**: Built-in guidance

### 3. **Simple Examples** - `npm run simple`
Feature-rich examples with metadata and NFTs.
```bash
npm run simple
```
- 🖼️ **NFT support**: Includes NFT detection and metadata
- 🏷️ **Rich metadata**: Token names, symbols, descriptions
- 🎛️ **Configurable**: Multiple example modes
- 📚 **Educational**: Shows advanced features

### 4. **Full Example** - `npm run dev`
Complete demonstration with HTTP server.
```bash
npm run dev
```
- 🌐 **HTTP API**: Express.js server integration
- 🔄 **Real-time processing**: Live portfolio calculations
- 📡 **Server endpoints**: RESTful API examples
- 🛡️ **Error handling**: Production-ready patterns

## 🎯 Quick Start

Choose the example that fits your needs:

```bash
# Quick test (recommended first)
npm run demo

# Comprehensive testing
npm run basic

# See advanced features
npm run simple

# Full server example
npm run dev
```

## 📖 Example Outputs

### Demo Output
```
⚡ Quick Portfolio Calculator Demo

1️⃣ Initializing calculator...
2️⃣ Checking network connectivity...
   Network: ✅ Connected (45ms)
3️⃣ Calculating portfolio (fast mode)...
✅ Portfolio processed in 1427ms
📊 Results:
   • Total tokens: 2364
   • Calculation time: 1427ms

🪙 Sample tokens (first 5):
   1. Unknown: 20031000000000000
   2. Unknown: 8654264463009793
   3. Unknown: 7000000471870172

💰 Tokens with balance: 2364

⚡ Performance stats:
   • Processing speed: 1656.6 tokens/sec
   • Network efficiency: 0 failures
```

### Basic Test Output
```
🔧 Basic Portfolio Calculator Test

1️⃣ Creating calculator instance...
   ✅ Calculator created successfully

2️⃣ Testing address validation...
   Valid address: ✅
   Invalid address: ✅

3️⃣ Testing network connection...
   ✅ Network connection OK (42ms)
   RPC: https://api.mainnet-beta.solana.com

4️⃣ Testing portfolio calculation...
   Address: 9WzDXwBb...9zYtAWWM
   ✅ Portfolio calculated in 979ms
   📊 Results:
      Total tokens: 2364
      Fungible tokens: 2364
      NFTs: 0
```

## 🔧 Configuration Options

All examples support environment variables:

```bash
# Custom RPC endpoint
SOLANA_RPC_URL="https://api.devnet.solana.com" npm run demo

# Using different endpoints
SOLANA_RPC_URL="https://solana-api.projectserum.com" npm run basic
```

## 🎛️ Example Modes

### Simple Example Modes
```bash
# Run simple example
npm run simple

# Run advanced example
npm run simple -- --advanced

# Run both examples
npm run simple -- --both
```

### Basic Example Help
```bash
# Show help
npm run basic -- --help
```

## ⚙️ Performance Tuning

Examples include different performance configurations:

- **Demo**: Ultra-fast, minimal data
- **Basic**: Balanced speed and features  
- **Simple**: Rich metadata, some slower
- **Full**: Complete features, production-ready

## 🔍 Troubleshooting

If examples fail:

1. **Check network**: Verify internet connection
2. **Try different RPC**: Use `SOLANA_RPC_URL` environment variable
3. **Check Solana network**: Verify mainnet is operational
4. **Review logs**: Examples include detailed error messages

## 📚 Learn More

- Check the main README for API documentation
- Review source code in `src/examples/` for implementation details
- Test with different wallet addresses
- Experiment with configuration options

## 💡 Tips

- Start with `npm run demo` for quick testing
- Use `npm run basic` for comprehensive validation
- Try different RPC endpoints for better performance
- Check network latency with the built-in health check

---

🚀 **Ready to integrate?** Check out the main documentation for API details and integration guides!