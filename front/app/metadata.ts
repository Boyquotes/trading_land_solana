import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Trading Land - Solana games in your browser',
    description:
      'Solana games in your browser. Monitor your portfolio and trade with fun.',
    openGraph: {
      title: 'NotBlox - Play multiplayer games in your browser',
      description:
        'Play multiplayer games in your browser. Create your own games and share them with your friends.',
      images: ['/PreviewTestGame.webp'],
      siteName: 'Trading Land',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Tradingland_SOL',
      creator: '@Tradingland_SOL',
    },
  };
}
