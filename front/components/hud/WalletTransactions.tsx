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
      let pageNumber = 1;
      
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
        
        // Save this batch of transactions to a file via the API
        try {
          // Sauvegarder le lot de transactions actuel
          const saveResponse = await fetch('/api/save-transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              address,
              pageNumber,
              transactions: signaturesBatch
            }),
          });
          
          const saveResult = await saveResponse.json();
          
          if (saveResult.success) {
            console.log(`Saved page ${pageNumber} of transactions to ${saveResult.path}`);
            pageNumber++;
          } else {
            console.error('Error saving transactions:', saveResult.error);
          }
        } catch (saveError) {
          console.error('Error saving transactions batch:', saveError);
        }
        
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
      
      // Créer un résumé des transactions et le sauvegarder dans un fichier
      try {
        // Collecter les informations sur chaque page de transactions
        const pagesSummary = [];
        
        // Stocker les dernières signatures de chaque page
        interface PageSignature {
          signature: string;
          blockTime: number | null;
          blockTimeFormatted: string;
          transactionCount: number;
        }
        
        const pageSignatures: Record<number, PageSignature> = {};
        
        // Parcourir les signatures récupérées pour identifier les dernières signatures de chaque page
        let currentPage = 1;
        let transactionsInCurrentPage = 0;
        const transactionsPerPage: Record<number, number> = {};
        
        // Parcourir les signatures dans l'ordre inverse (du plus récent au plus ancien)
        for (let i = 0; i < allSignatures.length; i++) {
          // Ajouter la transaction à la page actuelle
          transactionsInCurrentPage++;
          
          // Compter les transactions par page
          if (!transactionsPerPage[currentPage]) {
            transactionsPerPage[currentPage] = 0;
          }
          transactionsPerPage[currentPage]++;
          
          // Si nous avons atteint 100 transactions ou c'est la dernière transaction
          if (transactionsInCurrentPage === 100 || i === allSignatures.length - 1) {
            // Enregistrer la dernière signature de cette page (la plus ancienne)
            pageSignatures[currentPage] = {
              signature: allSignatures[i].signature,
              blockTime: allSignatures[i].blockTime,
              blockTimeFormatted: allSignatures[i].blockTime ? new Date(allSignatures[i].blockTime * 1000).toLocaleString() : 'unknown',
              transactionCount: transactionsPerPage[currentPage] || 0
            };
            
            // Passer à la page suivante
            currentPage++;
            transactionsInCurrentPage = 0;
          }
        }
        
        // Créer les informations de page pour le résumé
        for (let i = 1; i < pageNumber; i++) {
          const filename = `${address.replace(/[^a-zA-Z0-9]/g, '_')}_TRANSACTIONS_page-${i}.json`;
          
          // Utiliser les informations de signature que nous avons collectées
          if (pageSignatures[i]) {
            const pageInfo = {
              pageNumber: i,
              filename: filename,
              transactionCount: pageSignatures[i].transactionCount,
              lastSignature: pageSignatures[i].signature,
              lastBlockTime: pageSignatures[i].blockTime,
              lastBlockTimeFormatted: pageSignatures[i].blockTimeFormatted,
              timestamp: Date.now()
            };
            pagesSummary.push(pageInfo);
          } else {
            // Fallback si nous n'avons pas d'informations pour cette page
            const pageInfo = {
              pageNumber: i,
              filename: filename,
              transactionCount: 0,
              lastSignature: 'Unknown',
              lastBlockTime: null,
              lastBlockTimeFormatted: 'unknown',
              timestamp: Date.now()
            };
            pagesSummary.push(pageInfo);
          }
        }
        
        // Créer l'objet de résumé
        const summary = {
          lastFetched: new Date().toISOString(),
          totalPages: pageNumber - 1,
          totalTransactions: allSignatures.length,
          walletCreationDate: creationDate,
          earliestTransaction: earliestTransaction,
          pages: pagesSummary
        };
        
        // Sauvegarder le résumé via l'API existante
        const summaryResponse = await fetch('/api/save-transactions-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address,
            summary
          }),
        });
        
        const summaryResult = await summaryResponse.json();
        
        if (summaryResult.success) {
          console.log(`Saved transactions summary to ${summaryResult.path}`);
        } else {
          console.error('Error saving transactions summary:', summaryResult.error);
        }
      } catch (summaryError) {
        console.error('Error creating transactions summary:', summaryError);
      }
      
      // Add a notification to inform the user
      const notifId = Date.now();
      setNotifications([{ 
        id: notifId, 
        content: `Found ${allSignatures.length} transactions. Wallet creation: ${creationDate}. Saved to /transactions/`, 
        author: "Solana Explorer", 
        timestamp: notifId 
      }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }, 10000); // Show this one a bit longer
      
      // Ajouter une notification pour indiquer où les transactions ont été sauvegardées
      const saveNotifId = Date.now() + 1;
      setNotifications(prev => [...prev, { 
        id: saveNotifId, 
        content: `Transactions sauvegardées dans ${pageNumber - 1} fichiers dans /transactions/ avec un fichier de résumé ${address.replace(/[^a-zA-Z0-9]/g, '_')}.json`, 
        author: "Solana Explorer", 
        timestamp: saveNotifId 
      }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== saveNotifId));
      }, 12000); // Afficher plus longtemps pour que l'utilisateur puisse lire le message complet
      
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
