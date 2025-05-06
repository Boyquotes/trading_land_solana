"use client";
import React from 'react'
// Make sure to install next-themes: npm install next-themes
import Image from 'next/image'
import { Github, Twitter } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'

export default function Navbar() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (mounted) {
      console.log('Theme changed:', resolvedTheme);
    }
  }, [resolvedTheme, mounted]);
  return (
    <section className="w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 py-4">
          <picture>
            <source srcSet="/LogoFlat.png" media="(prefers-color-scheme: dark)" />
            <Image
              src="/LogoFlat.png"
              alt="Logo"
              width={50}
              height={50}
              className="transition-transform duration-300 hover:scale-110 hover:opacity-80 hover:rotate-180 rounded-xl"
            />
          </picture>
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold leading-none text-black dark:text-white select-none transition-opacity duration-300 hover:opacity-80">
              <Link href="/">
                Trading Land
              </Link>
            </h2>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 ml-1">Trading game on Solana.</span>
          </div>
        </div>

        {/* Social Icons (GitHub, Discord, Twitter) */}
        <div className="hidden md:flex space-x-4">
          <a href="https://discord.gg/kPhgtj49U2" target="_blank" rel="noopener noreferrer">
  {!mounted ? (
    <span style={{ width: 24, height: 24, display: 'inline-block' }} />
  ) : (
    <Image
      src={resolvedTheme === 'dark' ? '/discord-white-icon.png' : '/discord-black-icon.png'}
      alt="Discord"
      width={24}
      height={24}
    />
  )}
</a>
          <a href="https://twitter.com/Tradingland_SOL" target="_blank" rel="noopener noreferrer">
            <Twitter className="h-6 w-6 text-gray-800 hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-300" />
          </a>
          <a href="https://github.com/Boyquotes" target="_blank" rel="noopener noreferrer">
            <Github className="h-6 w-6 text-gray-800 hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-300" />
          </a>
        </div>
      </div>
    </section>
  )
}
