import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API handler to save wallet data to a JSON file
 * POST /api/save-wallet
 * Body: { address: string, walletData: object, date: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const requestData = await request.json();
    const { address, walletData, date, fileName: customFileName } = requestData;
    
    // Validate input
    if (!address || !walletData) {
      return NextResponse.json(
        { error: 'Missing required fields: address and walletData' },
        { status: 400 }
      );
    }
    
    // Sanitize the address to create a valid filename
    // Remove any characters that might be invalid in a filename
    const sanitizedAddress = address.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Use custom filename if provided, otherwise use default format
    const fileName = customFileName || `${sanitizedAddress}_WALLET_${date}.json`;
    
    // Define the directory path and ensure it exists
    const walletsDir = path.join(process.cwd(), 'public', 'wallets');
    if (!fs.existsSync(walletsDir)) {
      fs.mkdirSync(walletsDir, { recursive: true });
    }
    
    // Define the full file path
    const filePath = path.join(walletsDir, fileName);
    
    // Write the data to a JSON file
    fs.writeFileSync(filePath, JSON.stringify(walletData, null, 2), 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      message: `Wallet data saved to ${fileName}`,
      path: `/wallets/${fileName}`
    });
  } catch (error: unknown) {
    console.error('Error saving wallet data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to save wallet data', details: errorMessage },
      { status: 500 }
    );
  }
}