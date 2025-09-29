import { Connection, PublicKey } from '@solana/web3.js';
import { TokenListProvider, ENV } from '@solana/spl-token-registry';
import { Metaplex } from '@metaplex-foundation/js';
import { findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';
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
}\n\n/**\n * Get comprehensive token metadata by trying multiple sources\n * @param connection - Solana connection\n * @param mintAddress - Token mint address\n * @param balance - Token balance (used to determine if it's an NFT)\n * @returns Complete token metadata\n */\nexport async function getTokenMetadata(\n  connection: Connection,\n  mintAddress: string,\n  balance: number = 0\n): Promise<TokenMetadata> {\n  try {\n    // First try to get from SPL Token Registry\n    const registryInfo = await getTokenInfoFromRegistry(mintAddress);\n    if (registryInfo) {\n      console.log(`Token info found in registry for ${mintAddress}:`, registryInfo);\n      return {\n        name: registryInfo.name,\n        symbol: registryInfo.symbol,\n        logo: registryInfo.logoURI || null,\n        description: null,\n        externalUrl: null,\n        isNFT: balance === 1,\n        metadataUri: null\n      };\n    }\n    \n    // If not in registry, try Metaplex\n    console.log(`Token not found in registry, trying Metaplex for ${mintAddress}`);\n    const metaplexMetadata = await getTokenMetadataFromMetaplex(connection, mintAddress);\n    \n    if (metaplexMetadata) {\n      console.log(`Metadata found via Metaplex for ${mintAddress}:`, metaplexMetadata);\n      return {\n        ...metaplexMetadata,\n        isNFT: balance === 1\n      };\n    }\n    \n    // If no metadata found, create fallback\n    console.log(`No metadata found for ${mintAddress}, using fallback`);\n    const isNFT = balance === 1;\n    const shortAddr = `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`;\n    \n    return {\n      name: isNFT ? `NFT ${shortAddr}` : `Token ${shortAddr}`,\n      symbol: isNFT ? 'NFT' : mintAddress.slice(0, 4).toUpperCase(),\n      logo: null,\n      description: null,\n      externalUrl: null,\n      isNFT,\n      metadataUri: null\n    };\n  } catch (error) {\n    console.error(`Error fetching token metadata for ${mintAddress}:`, error);\n    \n    // Return safe fallback values\n    const isNFT = balance === 1;\n    return {\n      name: `Token ${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,\n      symbol: mintAddress.slice(0, 4).toUpperCase(),\n      logo: null,\n      description: null,\n      externalUrl: null,\n      isNFT,\n      metadataUri: null\n    };\n  }\n}\n\n/**\n * Get token symbol only\n * @param connection - Solana connection\n * @param mintAddress - Token mint address\n * @returns Token symbol or null\n */\nexport async function getTokenSymbol(\n  connection: Connection,\n  mintAddress: string\n): Promise<string | null> {\n  try {\n    // Try registry first\n    const registryInfo = await getTokenInfoFromRegistry(mintAddress);\n    if (registryInfo?.symbol) {\n      return registryInfo.symbol;\n    }\n    \n    // Try Metaplex\n    const metaplex = new Metaplex(connection);\n    const mintPublicKey = new PublicKey(mintAddress);\n    const nft = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey });\n    \n    return nft.symbol || null;\n  } catch (error) {\n    console.error('Error fetching token symbol:', error);\n    // Return a symbol based on the address\n    return mintAddress.slice(0, 4).toUpperCase() || null;\n  }\n}\n\n/**\n * Batch fetch metadata for multiple tokens\n * @param connection - Solana connection\n * @param mintAddresses - Array of mint addresses\n * @param maxConcurrency - Maximum concurrent requests\n * @returns Map of mint address to metadata\n */\nexport async function batchGetTokenMetadata(\n  connection: Connection,\n  mintAddresses: string[],\n  maxConcurrency: number = 10\n): Promise<Map<string, TokenMetadata>> {\n  const results = new Map<string, TokenMetadata>();\n  const chunks: string[][] = [];\n  \n  // Split into chunks for concurrent processing\n  for (let i = 0; i < mintAddresses.length; i += maxConcurrency) {\n    chunks.push(mintAddresses.slice(i, i + maxConcurrency));\n  }\n  \n  for (const chunk of chunks) {\n    const promises = chunk.map(async (mint) => {\n      try {\n        const metadata = await getTokenMetadata(connection, mint);\n        results.set(mint, metadata);\n      } catch (error) {\n        console.error(`Failed to fetch metadata for ${mint}:`, error);\n        // Set fallback metadata\n        results.set(mint, {\n          name: `Token ${mint.slice(0, 4)}...${mint.slice(-4)}`,\n          symbol: mint.slice(0, 4).toUpperCase(),\n          logo: null,\n          description: null,\n          externalUrl: null,\n          isNFT: false,\n          metadataUri: null\n        });\n      }\n    });\n    \n    await Promise.all(promises);\n  }\n  \n  return results;\n}