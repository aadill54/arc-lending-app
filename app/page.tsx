'use client'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useState } from 'react'

export default function Home() {
  const { isConnected } = useAccount()
  const [deposited, setDeposited] = useState(0)
  const [borrowed, setBorrowed] = useState(0)
  const [amount, setAmount] = useState('')

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#c9a84c' }}>⬡ Arc Lending</h1>
        <ConnectButton />
      </div>

      {!isConnected ? (
        <div style={{ textAlign: 'center', marginTop: '5rem' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Onchain Finance</h2>
          <p style={{ color: '#888', marginBottom: '2rem' }}>Connect your wallet to deposit and borrow USDC on Arc Testnet</p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Deposited', value: `${deposited} USDC`, color: '#4fc3f7' },
              { label: 'Borrowed', value: `${borrowed} USDC`, color: '#c9a84c' },
              { label: 'Health', value: borrowed === 0 ? 'Safe ✅' : deposited > 0 ? `${((deposited - borrowed) / deposited * 100).toFixed(0)}%` : 'Risky ⚠️', color: '#81c784' },
            ].map(card => (
              <div key={card.label} style={{ background: '#13131f', border: '1px solid #2a2a3f', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{card.label}</div>
                <div style={{ color: card.color, fontSize: '1.5rem', fontFamily: 'DM Mono' }}>{card.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: '#13131f', border: '1px solid #2a2a3f', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ color: '#4fc3f7', marginBottom: '1rem' }}>💰 Deposit USDC</h3>
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ marginBottom: '1rem' }}
              />
              <button
                onClick={() => { setDeposited(d => d + Number(amount)); setAmount('') }}
                style={{ width: '100%', background: '#4fc3f7', color: '#0a0a0f', fontSize: '1rem' }}
              >
                Deposit
              </button>
            </div>

            <div style={{ background: '#13131f', border: '1px solid #2a2a3f', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ color: '#c9a84c', marginBottom: '1rem' }}>🏦 Borrow USDC</h3>
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ marginBottom: '1rem' }}
              />
              <button
                onClick={() => {
                  if (Number(amount) <= deposited * 0.8) {
                    setBorrowed(b => b + Number(amount))
                    setAmount('')
                  } else {
                    alert('You can only borrow up to 80% of what you deposited!')
                  }
                }}
                style={{ width: '100%', background: '#c9a84c', color: '#0a0a0f', fontSize: '1rem' }}
              >
                Borrow
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}