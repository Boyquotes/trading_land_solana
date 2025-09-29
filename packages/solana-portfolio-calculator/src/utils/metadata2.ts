import { Connection, PublicKey } from '@solana/web3.js';
import { TokenListProvider } from '@solana/spl-token-registry';
import { Metaplex } from '@metaplex-foundation/js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TokenMetadata } from '../types';

/**
 * Get token info from SPL Token Registry
 * @param mintAddress - Token mint address
 * @returns Token info from registry or null if not found
 */
export async function getTokenInfoFromRegistry(mintAddress: string) {
  try {
    const tokenListProvider = new TokenListProvider();
    const tokenList = await tokenListProvider.resolve();
    const list = tokenList.filterByClusterSlug('mainnet-beta').getList();
    
    // Find the token in the list
    const tokenInfo = list.find((token) => token.address === mintAddress);
    
    return tokenInfo || null;
  } catch (error) {
    console.error('Error fetching token info from registry:', error);
    return null;
  }
}

/**
 * Get token metadata using Metaplex
 * @param connection - Solana connection
 * @param mintAddress - Token mint address
 * @returns Token metadata or null if not found
 */
export async function getTokenMetadataFromMetaplex(
  connection: Connection,
  mintAddress: string
): Promise<TokenMetadata | null> {
  try {
    const metaplex = new Metaplex(connection);
    const mintPublicKey = new PublicKey(mintAddress);
    
    // Try direct NFT fetch - this is the most reliable method
    const nft = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey });
    
    return {
      name: nft.name || null,
      symbol: nft.symbol || null,
      description: nft.json?.description || null,
      logo: nft.json?.image || null,
      externalUrl: nft.json?.external_url || null,
      isNFT: true, // Assume NFT if found via Metaplex
      metadataUri: nft.uri || null
    };
  } catch (error) {
    console.error(`Error fetching metadata from Metaplex for ${mintAddress}:`, error);
    return null;
  }
}

/**
 * Get comprehensive token metadata by trying multiple sources
 * @param connection - Solana connection
 * @param mintAddress - Token mint address
 * @param balance - Token balance (used to determine if it's an NFT)
 * @returns Complete token metadata
 */
export async function getTokenMetadata(
  connection: Connection,
  mintAddress: string,
  balance: number = 0
): Promise<TokenMetadata> {
  try {
    // First try to get from SPL Token Registry
    const registryInfo = await getTokenInfoFromRegistry(mintAddress);
    if (registryInfo) {
      console.log(`Token info found in registry for ${mintAddress}:`, registryInfo);
      return {
        name: registryInfo.name,
        symbol: registryInfo.symbol,
        logo: registryInfo.logoURI || null,
        description: null,
        externalUrl: null,
        isNFT: balance === 1,
        metadataUri: null
      };
    }
    
    // If not in registry, try Metaplex
    console.log(`Token not found in registry, trying Metaplex for ${mintAddress}`);
    const metaplexMetadata = await getTokenMetadataFromMetaplex(connection, mintAddress);
    
    if (metaplexMetadata) {
      console.log(`Metadata found via Metaplex for ${mintAddress}:`, metaplexMetadata);
      return {
        ...metaplexMetadata,
        isNFT: balance === 1
      };
    }
    
    // If no metadata found, create fallback
    console.log(`No metadata found for ${mintAddress}, using fallback`);
    const isNFT = balance === 1;
    const shortAddr = `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`;
    
    return {
      name: isNFT ? `NFT ${shortAddr}` : `Token ${shortAddr}`,
      symbol: isNFT ? 'NFT' : mintAddress.slice(0, 4).toUpperCase(),
      logo: null,
      description: null,
      externalUrl: null,
      isNFT,
      metadataUri: null
    };
  } catch (error) {
    console.error(`Error fetching token metadata for ${mintAddress}:`, error);
    
    // Return safe fallback values
    const isNFT = balance === 1;
    return {
      name: `Token ${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
      symbol: mintAddress.slice(0, 4).toUpperCase(),
      logo: null,
      description: null,
      externalUrl: null,
      isNFT,
      metadataUri: null
    };
  }
}