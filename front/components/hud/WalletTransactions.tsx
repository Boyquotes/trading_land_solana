import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';

type NotificationType = {
  id: number;
  content: string;
  author: string;
  timestamp: number;
};

interface WalletTransactionsProps {
  address?: string;
  solanaConnection: Connection;
  setNotifications: (notificationsFn: NotificationType[] | ((prev: NotificationType[]) => NotificationType[])) => void;
}

export function WalletTransactions({ 
  address, 
  solanaConnection, 
  setNotifications 
}: WalletTransactionsProps) {
  // State for transaction history
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [walletCreationDate, setWalletCreationDate] = useState<string>('Unknown');
  const [transactionCount, setTransactionCount] = useState<number>(0);

  // Get signatures for address using Solana web3.js
  async function getSignaturesForAddress(address: string) {
    console.log(`Getting signatures for address: ${address}`);
    try {
      setIsLoading(true);
      
      // Create a PublicKey from the address string
      const publicKey = new PublicKey(address);
      
      // Show loading notification
      const loadingId = Date.now();
      setNotifications([{ 
        id: loadingId, 
        content: `Fetching transaction history for ${address.slice(0, 4)}...${address.slice(-4)}`, 
        author: "Solana Explorer", 
        timestamp: loadingId 
      }]);
      
      // We need to paginate to get 2000 transactions
      let allSignatures: any[] = [];
      let lastSignature = null;
      let hasMore = true;
      
      // Loop until we have 2000 signatures or there are no more to fetch
      while (allSignatures.length < 2000 && hasMore) {
        // Prepare options for the API call
        const options: any = { limit: 100 }; // Fetch 100 at a time (API limit)
        if (lastSignature) {
          options.before = lastSignature;
        }
        
        // Get batch of signatures
        const signaturesBatch = await solanaConnection.getSignaturesForAddress(publicKey, options);
        
        // If we got fewer than requested, we've reached the end
        if (signaturesBatch.length < 100) {
          hasMore = false;
        }
        
        // Add this batch to our collection
        allSignatures = [...allSignatures, ...signaturesBatch];
        
        // Update the loading notification
        setNotifications([{ 
          id: loadingId, 
          content: `Fetched ${allSignatures.length} transactions so far...`, 
          author: "Solana Explorer", 
          timestamp: loadingId 
        }]);
        
        // If we have more to fetch, set the last signature for pagination
        if (hasMore && signaturesBatch.length > 0) {
          lastSignature = signaturesBatch[signaturesBatch.length - 1].signature;
        }
      }
      
      // Clear the loading notification
      setNotifications((prev) => prev.filter((n) => n.id !== loadingId));
      
      console.log(`Found ${allSignatures.length} signatures for address ${address}:`);
      setTransactionCount(allSignatures.length);
      
      // Find the earliest transaction (wallet creation date)
      let earliestTransaction = null;
      
      for (const sig of allSignatures) {
        if (sig.blockTime && (!earliestTransaction || sig.blockTime < earliestTransaction.blockTime)) {
          earliestTransaction = sig;
        }
      }
      
      // Format and display the wallet creation date
      let creationDate = 'Unknown';
      if (earliestTransaction && earliestTransaction.blockTime) {
        const date = new Date(earliestTransaction.blockTime * 1000);
        creationDate = date.toLocaleString();
        setWalletCreationDate(creationDate);
        console.log('Wallet creation date (earliest transaction):', creationDate);
        console.log('Earliest transaction:', earliestTransaction);
      }
      
      // Log each signature with its details (just the first 50 to avoid console overload)
      allSignatures.slice(0, 50).forEach((sig, index) => {
        console.log(`Signature ${index + 1}:`, {
          signature: sig.signature,
          slot: sig.slot,
          blockTime: sig.blockTime ? new Date(sig.blockTime * 1000).toLocaleString() : 'unknown',
          err: sig.err ? 'Failed' : 'Success',
          memo: sig.memo || 'No memo',
          confirmationStatus: sig.confirmationStatus
        });
      });
      
      // Add a notification to inform the user
      const notifId = Date.now();
      setNotifications([{ 
        id: notifId, 
        content: `Found ${allSignatures.length} transactions. Wallet creation: ${creationDate}`, 
        author: "Solana Explorer", 
        timestamp: notifId 
      }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }, 10000); // Show this one a bit longer
      
    } catch (error) {
      console.error('Error getting signatures:', error);
      
      // Show error notification
      const notifId = Date.now();
      setNotifications([{ 
        id: notifId, 
        content: `Error fetching transaction history: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        author: "Solana Explorer", 
        timestamp: notifId 
      }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  }

  // Expose the getSignaturesForAddress function to be called from outside
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).getWalletTransactions = getSignaturesForAddress;
    }
    
    return () => {
      // Clean up
      if (typeof window !== 'undefined') {
        delete (window as any).getWalletTransactions;
      }
    };
  }, []);

  return null; // This component doesn't render anything
}

export default WalletTransactions;
