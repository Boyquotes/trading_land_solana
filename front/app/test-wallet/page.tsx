// Test file for the wallet API endpoint
// Run this with: npm run dev and navigate to /test-wallet in your browser

import React, { useState } from 'react';
import { fetchWalletContent, fetchWalletContentDetailed } from '../../utils/walletApiClient';
import { TokenInfo } from '../api/wallet/[address]/route';

const TestWalletPage: React.FC = () => {
  const [address, setAddress] = useState('');
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const handleFetchWallet = async () => {
    if (!address.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setError(null);
    setTokens([]);

    try {
      const result = await fetchWalletContentDetailed(address);
      
      if (result && result.success) {
        setTokens(result.tokens);
        setLastUpdated(result.lastUpdated);
        setError(null);
      } else {
        setError(result?.error || 'Failed to fetch wallet data');
        setTokens([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    setError(null);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Test Wallet API Endpoint</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Enter Solana wallet address..."
          value={address}
          onChange={handleAddressChange}
          style={{
            width: '500px',
            padding: '10px',
            marginRight: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <button
          onClick={handleFetchWallet}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Fetching...' : 'Fetch Wallet'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Error: {error}
        </div>
      )}

      {lastUpdated && (
        <div style={{ marginBottom: '10px', color: '#666' }}>
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}

      {tokens.length > 0 && (
        <div>
          <h2>Wallet Contents ({tokens.length} tokens)</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <strong>Summary:</strong>
            <ul>
              <li>Total tokens: {tokens.length}</li>
              <li>NFTs: {tokens.filter(t => t.tokenIsNFT).length}</li>
              <li>Regular tokens: {tokens.filter(t => !t.tokenIsNFT).length}</li>
            </ul>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Symbol</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Name</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Balance</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Type</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Mint Address</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token, index) => (
                <tr key={token.mint} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {token.logo && (
                      <img 
                        src={token.logo} 
                        alt={token.symbol || 'Token'} 
                        style={{ width: '16px', height: '16px', marginRight: '5px' }}
                      />
                    )}
                    {token.symbol || 'Unknown'}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {token.name || 'Unknown'}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {token.balance}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: token.tokenIsNFT ? '#e3f2fd' : '#f3e5f5',
                      color: token.tokenIsNFT ? '#1976d2' : '#7b1fa2'
                    }}>
                      {token.tokenIsNFT ? 'NFT' : 'Token'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '12px' }}>
                    {token.mint.slice(0, 8)}...{token.mint.slice(-8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TestWalletPage;