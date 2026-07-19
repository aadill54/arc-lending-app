import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zenlend — Onchain Finance on Arc Testnet',
  description: 'Swap, lend, borrow, trade NFTs and predict markets on Arc Testnet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{<Providers>{children}</Providers>}</body>
    </html>
  )
}