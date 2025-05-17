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
    
    // If address is provided, filter files for that specific address
    if (address) {
      // More flexible matching - the address might be part of the filename in various formats
      targetFiles = targetFiles.filter(file => {
        // Try different patterns that might include the address
        return file.includes(address) || 
               // Check for sanitized versions of the address (some systems replace special chars)
               file.includes(address.replace(/[^a-zA-Z0-9]/g, '_'));
      });
      console.log(`Files for address ${address}:`, targetFiles);
      
      // If no files found for this address, try a more lenient approach
      if (targetFiles.length === 0) {
        console.log('No exact address matches found, trying partial matching');
        // Try to match just the first part of the address (first 10 chars)
        const addressPrefix = address.substring(0, 10);
        targetFiles = fs.readdirSync(walletsDir)
          .filter(file => file.endsWith('.json') && file.includes(addressPrefix));
        console.log(`Files matching address prefix ${addressPrefix}:`, targetFiles);
      }
    } else {
      // If no address provided, use files with ADDRESS_WALLET pattern
      targetFiles = targetFiles.filter(file => file.includes('ADDRESS_WALLET'));
      console.log('Generic wallet files:', targetFiles);
    }
    
    // If no wallet files found, return empty array
    if (targetFiles.length === 0) {
      console.warn('No matching wallet files found');
      return NextResponse.json({ data: [] });
    }
    
    // Sort files by date (assuming filename format includes date)
    // This will get the most recent file based on filename
    targetFiles.sort((a, b) => {
      return b.localeCompare(a); // Descending order
    });
    console.log('Sorted files:', targetFiles);
    
    // Get the most recent file
    const latestFile = targetFiles[0];
    const filePath = path.join(walletsDir, latestFile);
    console.log('Latest file:', latestFile);
    
    // Read and parse the JSON file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsedData = JSON.parse(fileContent);
    
    // Check the structure of the parsed data
    console.log('Parsed data structure:', {
      isArray: Array.isArray(parsedData),
      type: typeof parsedData,
      keys: typeof parsedData === 'object' ? Object.keys(parsedData) : 'not an object'
    });
    
    // Ensure walletData is an array
    let walletData: any[] = [];
    
    if (Array.isArray(parsedData)) {
      // Data is already an array
      walletData = parsedData;
    } else if (typeof parsedData === 'object' && parsedData !== null) {
      // Data might be an object with tokens as properties or in a nested property
      if (parsedData.tokens && Array.isArray(parsedData.tokens)) {
        // If there's a tokens array property
        walletData = parsedData.tokens;
      } else if (parsedData.data && Array.isArray(parsedData.data)) {
        // If there's a data array property
        walletData = parsedData.data;
      } else {
        // Try to convert object to array if it looks like a collection of tokens
        const possibleTokens = Object.values(parsedData);
        if (possibleTokens.length > 0 && typeof possibleTokens[0] === 'object') {
          walletData = possibleTokens;
        }
      }
    }
    
    console.log(`Found ${walletData.length} tokens in wallet data`);
    
    // Transform wallet data to portfolio format
    // Using the correct fields from the wallet data
    const portfolioData = walletData
      .filter((token: any) => token && typeof token === 'object' && !token.tokenIsNFT) // Filter out NFTs and ensure valid objects
      .map((token: any, index: number) => {
        // Use valueStableCoin if available, otherwise calculate based on price
        const price = token.price || 0;
        const totalActualPrice = token.valueStableCoin || (price * token.balance) || 0;
        
        // Use average price if available, otherwise use current price
        const averagePrice = token.averagePrice || price;
        const totalPrice = averagePrice * token.balance || totalActualPrice;
        
        return {
          _id: (index + 1).toString(),
          symbol: token.symbol || 'Unknown',
          mint: token.mint, // Include mint address
          actualPrice: price,
          averagePrice: averagePrice,
          numberCoin: token.balance || 0,
          name: token.name || token.symbol || 'Unknown',
          logo: token.logo || '',
          exchange: token.priceSource ? [token.priceSource.toLowerCase()] : ['unknown'],
          totalActualPrice: totalActualPrice,
          totalPrice: totalPrice,
          dateImport: new Date().toISOString()
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
