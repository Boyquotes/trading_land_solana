import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * API route pour sauvegarder les transactions d'un portefeuille
 * POST /api/save-transactions
 * Body: { address: string, pageNumber: number, transactions: any[] }
 * Format du nom de fichier: ADDRESS_TRANSACTIONS_page-X.json
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const data = await request.json();
    const { address, pageNumber, transactions } = data;

    // Validate required parameters
    if (!address || pageNumber === undefined || !transactions) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Sanitize the address to create a valid filename
    const sanitizedAddress = address.replace(/[^a-zA-Z0-9]/g, '_');

    // Ensure the transactions directory exists
    const transactionsDir = path.join(process.cwd(), 'public', 'transactions');
    if (!fs.existsSync(transactionsDir)) {
      fs.mkdirSync(transactionsDir, { recursive: true });
    }

    // Create the filename in the format ADDRESS_TRANSACTIONS_page-X.json
    const filename = `${sanitizedAddress}_TRANSACTIONS_page-${pageNumber}.json`;
    const filePath = path.join(transactionsDir, filename);

    // Prepare metadata to include with the transactions
    const dataToSave = {
      address,
      pageNumber,
      totalTransactions: transactions.length,
      savedAt: new Date().toISOString(),
      transactions
    };

    // Write the transactions data to the file
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));

    // Return success response
    return NextResponse.json({ 
      success: true, 
      filename,
      path: `/transactions/${filename}`,
      totalTransactions: transactions.length
    });
  } catch (error) {
    // Handle errors
    console.error('Error saving transactions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to save transactions', 
      details: errorMessage 
    }, { status: 500 });
  }
}
