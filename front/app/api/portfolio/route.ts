import { NextResponse } from 'next/server';

// Portfolio data
const portfolioData = [
  {
    "_id": "1",
    "symbol": "SOL",
    "actualPrice": 134.20,
    "averagePrice": 120.00,
    "numberCoin": 5.23,
    "exchange": ["jupiter", "raydium"],
    "totalActualPrice": 671.00,
    "totalPrice": 600.00,
    "dateImport": "2025-05-11T10:00:00Z"
  },
  {
    "_id": "2",
    "symbol": "PYTH",
    "actualPrice": 0.1509,
    "averagePrice": 0.12,
    "numberCoin": 1000.78,
    "exchange": ["jupiter"],
    "totalActualPrice": 150.90,
    "totalPrice": 120.00,
    "dateImport": "2025-05-11T10:00:00Z"
  },
  {
    "_id": "3",
    "symbol": "DFL",
    "actualPrice": 0.0002273,
    "averagePrice": 0.0002,
    "numberCoin": 500000.45,
    "exchange": ["raydium"],
    "totalActualPrice": 113.65,
    "totalPrice": 100.00,
    "dateImport": "2025-05-11T10:00:00Z"
  },
  {
    "_id": "4",
    "symbol": "JUP",
    "actualPrice": 0.5101,
    "averagePrice": 0.45,
    "numberCoin": 300.19,
    "exchange": ["jupiter"],
    "totalActualPrice": 153.03,
    "totalPrice": 135.00,
    "dateImport": "2025-05-11T10:00:00Z"
  },
  {
    "_id": "5",
    "symbol": "RAY",
    "actualPrice": 0.35,
    "averagePrice": 0.30,
    "numberCoin": 400.67,
    "exchange": ["raydium"],
    "totalActualPrice": 140.00,
    "totalPrice": 120.00,
    "dateImport": "2025-05-11T10:00:00Z"
  },
  {
    "_id": "6",
    "symbol": "MPLX",
    "actualPrice": 0.2630,
    "averagePrice": 0.25,
    "numberCoin": 600.34,
    "exchange": ["jupiter"],
    "totalActualPrice": 157.80,
    "totalPrice": 150.00,
    "dateImport": "2025-05-11T10:00:00Z"
  },
  {
    "_id": "7",
    "symbol": "PYTH",
    "actualPrice": 0.1509,
    "averagePrice": 0.14,
    "numberCoin": 800.52,
    "exchange": ["jupiter"],
    "totalActualPrice": 120.72,
    "totalPrice": 112.00,
    "dateImport": "2025-05-11T10:00:00Z"
  },
  {
    "_id": "8",
    "symbol": "DFL",
    "actualPrice": 0.0002273,
    "averagePrice": 0.00021,
    "numberCoin": 300000.91,
    "exchange": ["raydium"],
    "totalActualPrice": 68.19,
    "totalPrice": 63.00,
    "dateImport": "2025-05-11T10:00:00Z"
  }
];

export async function GET() {
  try {
    return NextResponse.json({ data: portfolioData });
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}
