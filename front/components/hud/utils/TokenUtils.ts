import axios from 'axios';
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TokenListProvider, ENV } from '@solana/spl-token-registry';
import { Metaplex } from '@metaplex-foundation/js';
import { findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';

// Helper function: sleep for ms milliseconds
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Get token accounts for a wallet address
export async function getTokenAccounts(walletAddress: string, solanaConnection: Connection) {
  try {
    const filters = [
      {
        dataSize: 165, // Size of account (bytes)
      },
      {
        memcmp: {
          offset: 32, // Offset into the account data
          bytes: walletAddress, // Address to compare
        },
      },
    ];

    const accounts = await solanaConnection.getParsedProgramAccounts(
      TOKEN_PROGRAM_ID,
      { filters }
    );

    return accounts.map(account => {
      const parsedAccountInfo: any = account.account.data;
      const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
      const tokenBalance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
      
      return {
        mint: mintAddress,
        balance: tokenBalance
      };
    }).filter(token => token.balance > 0); // Only return tokens with balance > 0
  } catch (error) {
    console.error('Error fetching token accounts:', error);
    return [];
  }
}

// Get token info from SPL Token Registry
export async function getTokenInfo(mintAddress: string) {
  try {
    const tokenListProvider = new TokenListProvider();
    const tokenList = await tokenListProvider.resolve();
    const list = tokenList.filterByClusterSlug('mainnet-beta').getList();
    
    // Find the token in the list
    const tokenInfo = list.find((token) => token.address === mintAddress);
    
    return tokenInfo || null;
  } catch (error) {
    console.error('Error fetching token info:', error);
    return null;
  }
}

// Get token symbol from Metaplex metadata
/**
 * Récupère le symbole d'un token à partir de son adresse mint
 * @param mintAddress Adresse du token mint
 * @returns Symbole du token ou null en cas d'erreur
 */
export async function getTokenSymbol(mintAddress: string): Promise<string | null> {
  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const metaplex = new Metaplex(connection);
    
    // Convert string to PublicKey
    const mintPublicKey = new PublicKey(mintAddress);
    
    // Find metadata PDA - ajouter le second paramètre requis (programId)
    const metadataPDA = findMetadataPda(mintPublicKey, new PublicKey(TOKEN_PROGRAM_ID));
    
    // Convertir le PDA en PublicKey pour l'utiliser avec findByMetadata
    const metadataPublicKey = new PublicKey(metadataPDA.toString());
    
    // Fetch metadata
    const metadata = await metaplex.nfts().findByMetadata({ metadata: metadataPublicKey });
    
    return metadata.symbol;
  } catch (error) {
    console.error('Error fetching token symbol:', error);
    return null;
  }
}

// Helper: getTokenSymbol but returns the symbol string
/**
 * Récupère le symbole d'un token à partir de son adresse mint
 * Version simplifiée qui utilise directement findByMint au lieu de findByMetadata
 * @param mintAddress Adresse du token mint
 * @returns Symbole du token ou null en cas d'erreur
 */
export async function getTokenSymbolReturnSymbol(mintAddress: string): Promise<string | null> {
  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const metaplex = new Metaplex(connection);
    
    // Convert string to PublicKey
    const mintPublicKey = new PublicKey(mintAddress);
    
    // Utiliser directement findByMint qui est plus fiable
    const nft = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey });
    
    return nft.symbol || null;
  } catch (error) {
    console.error('Error fetching token symbol:', error);
    // Retourner un symbole par défaut basé sur l'adresse
    return mintAddress.slice(0, 4).toUpperCase() || null;
  }
}

/**
 * Récupère les métadonnées d'un token à partir de son adresse mint
 * @param mintStrAddress Adresse du token mint
 * @param balance Solde du token (utilisé pour déterminer si c'est un NFT)
 * @returns Objet contenant le nom, le symbole et le logo du token
 */
export async function getTokenMetadata(mintStrAddress: string, balance: number = 0): Promise<{ name: string | null, symbol: string | null, logo: string | null }> {
  try {
    // First try to get from SPL Token Registry
    const tokenInfo = await getTokenInfo(mintStrAddress);
    if (tokenInfo) {
      console.log(`Token info found in registry for ${mintStrAddress}:`, tokenInfo);
      return {
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        logo: tokenInfo.logoURI || null
      };
    }
    
    // If not in registry, try Metaplex
    console.log(`Token not found in registry, trying Metaplex for ${mintStrAddress}`);
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const metaplex = new Metaplex(connection);
    
    // Try direct NFT fetch - this is the most reliable method
    try {
      console.log(`Trying direct NFT fetch for ${mintStrAddress}`);
      const mintPublicKey = new PublicKey(mintStrAddress);
      const nft = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey });
      
      console.log(`NFT data found for ${mintStrAddress}:`, nft);
      
      return {
        name: nft.name || null,
        symbol: nft.symbol || null,
        logo: nft.json?.image || null
      };
    } catch (nftError) {
      console.error(`Error with direct NFT fetch for ${mintStrAddress}:`, nftError);
      
      // Si nous n'avons pas pu récupérer les métadonnées, utiliser des valeurs par défaut
      // mais avec une meilleure présentation basée sur l'adresse et le solde
      const isNFT = balance === 1;
      const shortAddr = `${mintStrAddress.slice(0, 4)}...${mintStrAddress.slice(-4)}`;
      
      return {
        name: isNFT ? `NFT ${shortAddr}` : `Token ${shortAddr}`,
        symbol: isNFT ? 'NFT' : mintStrAddress.slice(0, 4).toUpperCase(),
        logo: null
      };
    }
  } catch (error) {
    console.error(`Error fetching token metadata for ${mintStrAddress}:`, error);
    // Return default values but don't fail completely
    return {
      name: `Token ${mintStrAddress.slice(0, 4)}...${mintStrAddress.slice(-4)}`,
      symbol: mintStrAddress.slice(0, 4).toUpperCase(),
      logo: null
    };
  }
}
