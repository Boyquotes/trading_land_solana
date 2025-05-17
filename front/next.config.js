/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    externalDir: true,
  },
  // Configure image domains to allow external images
  images: {
    domains: [
      'raw.githubusercontent.com',  // GitHub raw content
      'arweave.net',               // Arweave storage
      'www.arweave.net',           // Arweave storage (www subdomain)
      'shdw-drive.genesysgo.net',  // Shadow Drive
      'cdn.jsdelivr.net',          // jsDelivr CDN
      'ipfs.io',                   // IPFS gateway
    ],
    // Use remotePatterns for more control if needed in the future
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    }

    return config
  },
}

module.exports = nextConfig
