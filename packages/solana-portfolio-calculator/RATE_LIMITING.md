# Rate Limiting Documentation

## Overview

The Solana Portfolio Calculator now includes comprehensive rate limiting to prevent HTTP 429 (Too Many Requests) errors when fetching complete transaction histories from RPC endpoints.

## Features

### 1. Configurable Rate Limiting
- **Rate Limit Delay**: Configurable delay between batch requests (default: 500ms)
- **Batch Size**: Adjustable number of transactions per request (default: 100, server uses 50)
- **Enable/Disable**: Can be turned on/off via configuration

### 2. Intelligent Retry Logic
- **Exponential Backoff**: Automatic retry with increasing delays for 429 errors
- **Max Retries**: Configurable maximum retry attempts (default: 3, server uses 5)
- **Base Delay**: Initial retry delay in milliseconds (default: 1000ms, server uses 1500ms)

### 3. Error Detection
- Detects 429 errors from multiple sources:
  - HTTP status codes
  - Error messages containing "429" or "Too Many Requests"
  - Response objects with status 429

## Configuration

### TransactionManagerConfig

```typescript
interface TransactionManagerConfig {
  rpcEndpoint: string;
  timeout?: number;                    // Request timeout (default: 30000ms)
  batchSize?: number;                  // Transactions per request (default: 100)
  maxTransactions?: number;            // Max total transactions (default: 2000)
  rateLimitDelay?: number;             // Delay between requests (default: 500ms)
  maxRetries?: number;                 // Max retry attempts (default: 3)
  retryBaseDelay?: number;             // Initial retry delay (default: 1000ms)
  enableRateLimiting?: boolean;        // Enable rate limiting (default: true)
  customHeaders?: Record<string, string>;
}
```

### Server Defaults

The API server uses more conservative settings for production use:

```typescript
const transactionConfig = {
  rpcEndpoint: config.rpcEndpoint,
  batchSize: 50,                       // Smaller batches
  rateLimitDelay: 800,                 // 800ms between requests
  maxRetries: 5,                       // More retry attempts
  retryBaseDelay: 1500,                // Longer initial delay
  enableRateLimiting: true
};
```

## Usage Examples

### Basic Usage

```typescript
import { TransactionManager } from '@trading-land/solana-portfolio-calculator';

const manager = new TransactionManager({
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  rateLimitDelay: 1000,              // 1 second between requests
  maxRetries: 3,                     // Retry up to 3 times
  enableRateLimiting: true
});

const result = await manager.getCompleteTransactionHistory(address);
```

### Conservative Settings for Public RPC

```typescript
const manager = new TransactionManager({
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  batchSize: 25,                     // Small batches
  rateLimitDelay: 2000,              // 2 seconds between requests
  maxRetries: 5,                     // More retries
  retryBaseDelay: 2000,              // Longer delays
  enableRateLimiting: true
});
```

### Aggressive Settings for Premium RPC

```typescript
const manager = new TransactionManager({
  rpcEndpoint: 'https://premium-rpc-endpoint.com',
  batchSize: 200,                    // Larger batches
  rateLimitDelay: 100,               // Minimal delay
  maxRetries: 2,                     // Fewer retries needed
  enableRateLimiting: false          // Disable if RPC has no limits
});
```

## API Endpoints

The following endpoints automatically benefit from rate limiting:

- `GET /transactions/:address` - Get transaction history
- `GET /transactions/:address/complete` - Get complete transaction history
- `POST /transactions/batch` - Batch transaction requests

## Monitoring

The system provides detailed logging for rate limiting activities:

```
[TransactionManager] Fetching page 1 (batch size: 50)
[TransactionManager] Fetched page 1: 50 transactions (total: 50)
[TransactionManager] Rate limiting: waiting 800ms before next batch
[TransactionManager] Rate limited (429). Retrying in 1500ms (attempt 1/5)
```

## Performance Impact

### With Rate Limiting (Conservative)
- **Batch Size**: 50 transactions per request
- **Delay**: 800ms between requests
- **Total Time**: ~8 seconds for 500 transactions
- **Reliability**: High (no 429 errors)

### Without Rate Limiting
- **Batch Size**: 100+ transactions per request
- **Delay**: None
- **Total Time**: ~2 seconds for 500 transactions (when successful)
- **Reliability**: Low (frequent 429 errors requiring manual retries)

## Best Practices

1. **Use Conservative Settings for Public RPCs**: Free RPC endpoints have strict rate limits
2. **Adjust Based on RPC Provider**: Premium providers may allow more aggressive settings
3. **Monitor for 429 Errors**: Watch logs for retry messages to optimize settings
4. **Test Different Configurations**: Find the best balance for your use case
5. **Enable Rate Limiting by Default**: Better to be slow than to fail

## RPC Provider Recommendations

### Free/Public RPCs
```typescript
{
  batchSize: 25,
  rateLimitDelay: 2000,
  maxRetries: 5,
  retryBaseDelay: 2000
}
```

### Helius, QuickNode (Basic)
```typescript
{
  batchSize: 50,
  rateLimitDelay: 800,
  maxRetries: 3,
  retryBaseDelay: 1500
}
```

### Premium/Enterprise RPCs
```typescript
{
  batchSize: 100,
  rateLimitDelay: 200,
  maxRetries: 2,
  retryBaseDelay: 1000
}
```

## Troubleshooting

### Still Getting 429 Errors?
1. Increase `rateLimitDelay` (try doubling it)
2. Decrease `batchSize` 
3. Increase `maxRetries` and `retryBaseDelay`
4. Check RPC provider documentation for rate limits

### Too Slow?
1. Decrease `rateLimitDelay` gradually
2. Increase `batchSize` carefully
3. Consider upgrading to a premium RPC provider
4. Disable rate limiting only if you're certain about RPC limits

### Inconsistent Results?
1. Ensure `enableRateLimiting` is `true`
2. Check network stability
3. Verify RPC endpoint reliability
4. Consider using a backup RPC endpoint