import { RefObject } from 'react';

type WalletInfo = {
  id: string;
  name: string;
  logo: string;
};

type TokenInfo = {
  mint: string;
  balance: number;
  name?: string | null;
  symbol?: string | null;
  logo?: string | null;
  tokenIsNFT?: boolean;
  valueStableCoin?: number | null;
  price?: number | null;
  priceSource?: string;
};

type WalletState = {
  [address: string]: TokenInfo[];
};

interface WalletDropdownProps {
  walletDropdownOpen: boolean;
  walletDropdownRef: RefObject<HTMLDivElement>;
  addresses: string[];
  detectedWallets: WalletInfo[];
  wallet: WalletState;
  loadingPortfolio: {[address: string]: boolean};
  loadingPrice: {[address: string]: boolean};
  liveTokenCount: {[address: string]: number};
  handleWalletConnect: (walletId: string) => void;
  disconnectWallet: (address: string) => void;
  refreshTokenPrices: (address: string) => void;
}

export function WalletDropdown({
  walletDropdownOpen,
  walletDropdownRef,
  addresses,
  detectedWallets,
  wallet,
  loadingPortfolio,
  loadingPrice,
  liveTokenCount,
  handleWalletConnect,
  disconnectWallet,
  refreshTokenPrices
}: WalletDropdownProps) {
  if (!walletDropdownOpen) return null;

  // Helper function to format addresses for display
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  // Calculate total value for a wallet
  const calculateWalletValue = (address: string): string => {
    if (!wallet[address]) return '$0.00';
    
    const totalValue = wallet[address].reduce((sum, token) => {
      if (token.valueStableCoin) {
        return sum + token.valueStableCoin;
      }
      return sum;
    }, 0);
    
    return `$${totalValue.toFixed(2)}`;
  };

  return (
    <div ref={walletDropdownRef} className="absolute right-0 mt-2 w-72 bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-200 py-2 animate-fade-in z-50">
      <div className="px-4 py-2 font-semibold border-b border-gray-100 text-sm">Connected Wallets</div>
      {addresses.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-3">
          <div className="text-gray-500 text-sm mb-2">No wallets connected</div>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          {addresses.map((address) => (
            <div key={address} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">{formatAddress(address)}</div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => refreshTokenPrices(address)}
                    disabled={loadingPrice[address]}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
                  >
                    {loadingPrice[address] ? 'Loading...' : 'Refresh'}
                  </button>
                  <button 
                    onClick={() => disconnectWallet(address)}
                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
              
              <div className="mt-1 text-xs text-gray-500 flex justify-between">
                <div>
                  {loadingPortfolio[address] ? (
                    <span className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading tokens...
                    </span>
                  ) : (
                    <span>{liveTokenCount[address] || 0} tokens</span>
                  )}
                </div>
                <div className="font-semibold">{calculateWalletValue(address)}</div>
              </div>
              
              {wallet[address] && wallet[address].length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
                  {wallet[address]
                    .sort((a, b) => {
                      // Sort by value (if available), then by balance
                      const aValue = a.valueStableCoin || 0;
                      const bValue = b.valueStableCoin || 0;
                      return bValue - aValue || b.balance - a.balance;
                    })
                    .map((token, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center">
                          {token.logo ? (
                            <img src={token.logo} alt={token.symbol || 'Token'} className="w-4 h-4 mr-1 rounded-full" />
                          ) : (
                            <div className="w-4 h-4 mr-1 bg-gray-300 rounded-full flex items-center justify-center text-[8px]">
                              {token.symbol?.substring(0, 1) || '?'}
                            </div>
                          )}
                          <span className="font-medium">{token.symbol || 'Unknown'}</span>
                          {token.tokenIsNFT && (
                            <span className="ml-1 bg-purple-100 text-purple-800 text-[8px] px-1 rounded">NFT</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div>{token.balance.toFixed(token.tokenIsNFT ? 0 : 4)}</div>
                          {token.valueStableCoin !== null && token.valueStableCoin !== undefined && (
                            <div className="text-gray-500">${token.valueStableCoin.toFixed(2)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="px-4 py-2 font-semibold border-t border-b border-gray-100 text-sm mt-2">Available Wallets</div>
      <div className="px-4 py-2">
        {detectedWallets.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {detectedWallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleWalletConnect(wallet.id)}
                className="flex items-center justify-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded transition-colors text-sm"
              >
                {wallet.logo && (
                  <img src={wallet.logo} alt={wallet.name} className="w-4 h-4" />
                )}
                <span>{wallet.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-sm text-center">No compatible wallets detected</div>
        )}
      </div>
    </div>
  );
}
