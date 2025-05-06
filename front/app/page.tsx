"use client";
// import GameCard from '@/components/GameCard'
import GameContent from '@/components/GameContent'
import ThemeSwitch from '@/components/ThemeSwitch'
import KeyboardLayout from '@/components/KeyboardLayout'
import Navbar from '@/components/Navbar'
import { ExternalLink, Github, Twitter } from 'lucide-react'
import Link from 'next/link'
import { GameInfo } from '../types'
import gameData from '../public/gameData.json'

function getGamesBySlug(slug: string): GameInfo {
  const game = gameData.find((game) => game.slug === slug)
  if (!game) {
    throw new Error(`Game with slug "${slug}" not found`)
  }
  return game
}

const gameInfo = getGamesBySlug("tld")

export default function Home() {
  const games = gameData as GameInfo[]
  return (
    <div className="space-y-8 flex flex-col items-center px-4 container bg-background text-foreground min-h-screen">
        <div className="w-full flex justify-end pt-4"><ThemeSwitch /></div>
        <Navbar />
        <GameContent gameInfo={gameInfo} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {games &&
          games.map((game, index) => (
            <div
              className={`col-span-1 ${
                // Only make the last item span full width when total count is odd
                index === games.length - 1 && games.length % 2 !== 0 ? 'md:col-span-2' : ''
              }`}
              key={index}
            >
              {/* <GameCard {...game} /> */}
              {/* <GameContent {...game} /> */}
            </div>
          ))}
        </div>
        {/* <KeyboardLayout /> */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 my-4">
          <Link
            href={'https://discord.gg/kPhgtj49U2'}
            className="flex py-2 items-center justify-center   px-8   font-medium   border border-transparent rounded-md hover:bg-gray-100   md:text-lg md:px-10"
          >
            <ExternalLink className="mr-2" />
            Discord
          </Link>
          <Link
            href={'https://twitter.com/Tradingland_SOL'}
            className="flex py-2 items-center justify-center  px-8   font-medium   border border-transparent rounded-md hover:bg-gray-100    md:text-lg md:px-10"
          >
            <Twitter className="mr-2" />
            Twitter
          </Link>
          <Link
            href={'https://github.com/Boyquotes'}
            className="flex py-2 items-center justify-center   px-8   font-medium  border border-transparent rounded-md hover:bg-gray-100   md:text-lg md:px-10"
          >
            <Github className="mr-2" />
            Source Code
          </Link>
        </div>
    </div>
  )
}
