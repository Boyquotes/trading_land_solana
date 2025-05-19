import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * API route pour sauvegarder un résumé des transactions d'un portefeuille
 * POST /api/save-transactions-summary
 * Body: { 
 *   address: string, 
 *   summary: { 
 *     lastFetched: string, 
 *     totalPages: number, 
 *     totalTransactions: number,
 *     pages: Array<{ 
 *       pageNumber: number, 
 *       filename: string, 
 *       lastSignature: string, 
 *       timestamp: number 
 *     }> 
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const data = await request.json();
    const { address, summary } = data;

    // Validate required parameters
    if (!address || !summary) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Sanitize the address to create a valid filename
    const sanitizedAddress = address.replace(/[^a-zA-Z0-9]/g, '_');

    // Ensure the transactions directory exists
    const transactionsDir = path.join(process.cwd(), 'public', 'transactions');
    if (!fs.existsSync(transactionsDir)) {
      fs.mkdirSync(transactionsDir, { recursive: true });
    }

    // Create the filename in the format ADDRESS.json
    const filename = `${sanitizedAddress}.json`;
    const filePath = path.join(transactionsDir, filename);

    // Add metadata to the summary
    const dataToSave = {
      address,
      lastUpdated: new Date().toISOString(),
      ...summary
    };

    // Write the summary data to the file
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));

    // Return success response
    return NextResponse.json({ 
      success: true, 
      filename,
      path: `/transactions/${filename}`
    });
  } catch (error) {
    // Handle errors
    console.error('Error saving transactions summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to save transactions summary', 
      details: errorMessage 
    }, { status: 500 });
  }
}
