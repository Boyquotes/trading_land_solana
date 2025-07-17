import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API handler to list wallet files in the wallets directory
 * GET /api/list-wallets
 */
export async function GET() {
  try {
    // Define the directory path
    const walletsDir = path.join(process.cwd(), 'public', 'wallets');
    
    // Check if directory exists
    if (!fs.existsSync(walletsDir)) {
      // Create directory if it doesn't exist
      fs.mkdirSync(walletsDir, { recursive: true });
      return NextResponse.json({ 
        success: true, 
        files: [] 
      });
    }
    
    // Read directory contents
    const files = fs.readdirSync(walletsDir);
    
    // Filter for JSON files
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    return NextResponse.json({
      success: true,
      files: jsonFiles
    });
  } catch (error: unknown) {
    console.error('Error listing wallet files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to list wallet files', details: errorMessage },
      { status: 500 }
    );
  }
}
