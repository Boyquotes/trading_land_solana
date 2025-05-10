import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    // Forward the request to the external API
    const response = await axios.get(
      'http://37.187.141.70:8070/items/historical?filter%5Btags%5D%5B_contains%5D=solana-ecosystem&sort=datetime'
    );
    
    // Return the data from the external API
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching prices data:', error);
    return NextResponse.json({ error: 'Failed to fetch prices data' }, { status: 500 });
  }
}
