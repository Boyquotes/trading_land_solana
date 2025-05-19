import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// This is a Next.js API route handler for POST requests
export async function POST(request: Request) {
  try {
    // Parse the request body
    const data = await request.json();
    const { address, pageNumber, transactions } = data;

    // Validate required parameters
    if (!address || pageNumber === undefined || !transactions) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Ensure the transactions directory exists
    const transactionsDir = path.join(process.cwd(), 'public', 'transactions');
    if (!fs.existsSync(transactionsDir)) {
      fs.mkdirSync(transactionsDir, { recursive: true });
    }

    // Create the filename in the format WALLET_ADDRESS_page_X.json
    const filename = `${address}_page_${pageNumber}.json`;
    const filePath = path.join(transactionsDir, filename);

    // Write the transactions data to the file
    fs.writeFileSync(filePath, JSON.stringify(transactions, null, 2));

    // Return success response
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    // Handle errors
    console.error('Error saving transactions:', error);
    return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 });
  }
}
