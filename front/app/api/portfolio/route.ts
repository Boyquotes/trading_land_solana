import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Get the address from the URL query parameters
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  try {
    // Define the wallets directory path
    const walletsDir = path.join(process.cwd(), 'public', 'wallets');
    console.log('Wallets directory:', walletsDir);
    // Check if the directory exists
    if (!fs.existsSync(walletsDir)) {
      console.warn('Wallets directory does not exist:', walletsDir);
      return NextResponse.json({ data: [] });
    }
    console.log('Wallets directory exists:', walletsDir);
    // Filter files based on address if provided
    let targetFiles = fs.readdirSync(walletsDir)
      .filter(file => file.endsWith('.json'));
    
    console.log('All wallet files:', targetFiles);
    
    // Si une adresse est fournie, filtrer les fichiers pour cette adresse spécifique
    if (address) {
      // Sanitize l'adresse pour correspondre au format utilisé dans les noms de fichiers
      const sanitizedAddress = address.replace(/[^a-zA-Z0-9]/g, '_');
      
      // Filtrer les fichiers qui commencent par l'adresse sanitizée et qui contiennent WALLET ou PRICES
      targetFiles = targetFiles.filter(file => 
        file.startsWith(sanitizedAddress) && (file.includes('_WALLET_') || file.includes('_PRICES_'))
      );
      console.log(`Files for address ${address} (sanitized as ${sanitizedAddress}):`, targetFiles);
      
      // Si aucun fichier n'est trouvé pour cette adresse, essayer une approche plus souple
      if (targetFiles.length === 0) {
        console.log('No exact address matches found, trying partial matching');
        // Essayer de faire correspondre juste la première partie de l'adresse (10 premiers caractères)
        const addressPrefix = sanitizedAddress.substring(0, 10);
        targetFiles = fs.readdirSync(walletsDir)
          .filter(file => file.endsWith('.json') && file.startsWith(addressPrefix));
        console.log(`Files matching address prefix ${addressPrefix}:`, targetFiles);
      }
    } else {
      // Si aucune adresse n'est fournie, utiliser tous les fichiers JSON
      console.log('No address provided, using all JSON files');
    }
    
    // If no wallet files found, return empty array
    if (targetFiles.length === 0) {
      console.warn('No matching wallet files found');
      return NextResponse.json({ data: [] });
    }
    
    // Trier les fichiers par date en utilisant le timestamp dans le nom de fichier
    // Format attendu: ADDRESS_WALLET_TIMESTAMP.json ou ADDRESS_PRICES_TIMESTAMP.json
    targetFiles.sort((a, b) => {
      // Extraire les timestamps des noms de fichiers
      let timestampA, timestampB;
      
      // Détecter le type de fichier et extraire le timestamp en conséquence
      if (a.includes('_WALLET_')) {
        timestampA = a.split('_WALLET_')[1]?.replace('.json', '');
      } else if (a.includes('_PRICES_')) {
        timestampA = a.split('_PRICES_')[1]?.replace('.json', '');
      }
      
      if (b.includes('_WALLET_')) {
        timestampB = b.split('_WALLET_')[1]?.replace('.json', '');
      } else if (b.includes('_PRICES_')) {
        timestampB = b.split('_PRICES_')[1]?.replace('.json', '');
      }
      
      if (!timestampA || !timestampB) {
        return b.localeCompare(a); // Fallback au tri lexicographique si le format ne correspond pas
      }
      
      // Trier par timestamp en ordre décroissant (le plus récent en premier)
      return parseInt(timestampB) - parseInt(timestampA);
    });
    console.log('Sorted files by timestamp:', targetFiles);
    
    // Ajouter un log pour débogage
    console.log('Using the most recent wallet file for portfolio data');
    
    // Get the most recent file
    const latestFile = targetFiles[0];
    const filePath = path.join(walletsDir, latestFile);
    console.log('Latest file:', latestFile);
    
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let walletData: { address: string; lastUpdated: string; tokens: any[] } = { address: '', lastUpdated: '', tokens: [] };
    
    try {
      const parsedData = JSON.parse(fileContent);
      
      // Check if the data is in the expected format
      if (parsedData && parsedData.tokens && Array.isArray(parsedData.tokens)) {
        walletData = parsedData;
        console.log(`Successfully parsed wallet data with ${walletData.tokens.length} tokens`);
      } else {
        // Try to extract tokens from the data structure
        console.warn('Data structure not recognized, attempting to extract tokens');
        walletData = { address: '', lastUpdated: '', tokens: [] };
      }
    } catch (parseError) {
      console.error('Error parsing wallet file:', parseError);
      return NextResponse.json({ data: [] });
    }
    
    console.log(`Found ${walletData.tokens.length} tokens in wallet data`);
    
    // Transform wallet data to portfolio format
    // Using the correct fields from the wallet data
    const portfolioData = walletData.tokens
      .filter((token: any) => token && typeof token === 'object' && !token.tokenIsNFT) // Filter out NFTs and ensure valid objects
      .map((token: any, index: number) => {

        // S'assurer que nous avons un prix valide
        const price = token.price !== undefined && token.price !== null ? token.price : 0;
        
        // S'assurer que nous avons une balance valide
        const balance = token.balance !== undefined && token.balance !== null ? token.balance : 0;
        
        // Calculer la valeur du token (price * balance)
        let tokenValue;
        
        // Utiliser valueStableCoin si disponible
        if (token.valueStableCoin !== undefined && token.valueStableCoin !== null) {
          tokenValue = token.valueStableCoin;
        } 
        // Sinon, utiliser value si disponible
        else if (token.value !== undefined && token.value !== null) {
          tokenValue = token.value;
        } 
        // Sinon, calculer la valeur (price * balance)
        else {
          tokenValue = price * balance;
        }
        
        // Use average price if available, otherwise use current price
        const averagePrice = token.averagePrice || price;
        const totalPrice = averagePrice * balance || tokenValue;
        
        console.log(`Token ${token.symbol || 'Unknown'}: price=${price}, balance=${balance}, value=${tokenValue}`);
        
        return {
          _id: (index + 1).toString(),
          symbol: token.symbol || 'Unknown',
          mint: token.mint, // Include mint address
          actualPrice: price,
          averagePrice: averagePrice,
          numberCoin: balance,
          name: token.name || token.symbol || 'Unknown',
          logo: token.logo || '',
          exchange: token.priceSource ? [token.priceSource.toLowerCase()] : ['unknown'],
          totalActualPrice: tokenValue,
          totalPrice: totalPrice,
          dateImport: new Date().toISOString(),

          // Ajouter explicitement les champs pour le composant Portfolio
          price: price,
          value: tokenValue,
          valueStableCoin: tokenValue // Ajouter ce champ pour compatibilité

        };
      });
    
    return NextResponse.json({ data: portfolioData });
  } catch (error) {
    // More detailed error logging and response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching portfolio data:', error);
    console.error('Error details:', errorMessage);
    
    // Include more context in the error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch portfolio data', 
        details: errorMessage,
        address: address || 'none provided'
      },
      { status: 500 }
    );
  }
}
