'use client'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useState } from 'react'

type Transaction = {
  id: number
  type: string
  amount: string
  token: string
  time: string
  status: string
}

type ActivePage = 'dashboard' | 'lend' | 'borrow' | 'swap'

export default function Home() {
  const { isConnected, address } = useAccount()
  const [activePage, setActivePage] = useState<ActivePage>('dashboard')
  const [deposited, setDeposited] = useState(0)
  const [borrowed, setBorrowed] = useState(0)
  const [lendAmount, setLendAmount] = useState('')
  const [borrowAmount, setBorrowAmount] = useState('')
  const [swapFrom, setSwapFrom] = useState('USDC')
  const [swapTo, setSwapTo] = useState('EURC')
  const [swapAmount, setSwapAmount] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [toast, setToast] = useState('')

  const interest = deposited * 0.045
  const healthFactor = borrowed === 0 ? 100 : ((deposited - borrowed) / deposited) * 100

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const addTx = (type: string, amount: string, token: string) => {
    setTransactions(prev => [{
      id: Date.now(),
      type,
      amount,
      token,
      time: new Date().toLocaleTimeString(),
      status: 'Success'
    }, ...prev])
  }

  const navItems: { id: ActivePage; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'lend', icon: '💰', label: 'Lend' },
    { id: 'borrow', icon: '🏦', label: 'Borrow' },
    { id: 'swap', icon: '🔄', label: 'Swap' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>

      {/* Sidebar */}
      <div style={{ width: '240px', background: 'white', borderRight: '1px solid #e2e8f0', padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' }}>
        {/* Logo */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#2563eb' }}>⬡ ArcFi</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Onchain Finance</div>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                border: 'none', cursor: 'pointer', marginBottom: '0.5rem',
                background: activePage === item.id ? '#eff6ff' : 'transparent',
                color: activePage === item.id ? '#2563eb' : '#64748b',
                fontWeight: activePage === item.id ? '600' : '400',
                fontSize: '0.95rem', textAlign: 'left',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Network Badge */}
        <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '0.75rem', fontSize: '0.75rem' }}>
          <div style={{ color: '#2563eb', fontWeight: '600' }}>🟢 Arc Testnet</div>
          <div style={{ color: '#94a3b8', marginTop: '0.25rem' }}>Chain ID: 5042002</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: '240px', flex: 1, padding: '2rem' }}>

        {/* Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {activePage === 'dashboard' && 'Dashboard'}
              {activePage === 'lend' && 'Lend'}
              {activePage === 'borrow' && 'Borrow'}
              {activePage === 'swap' && 'Swap'}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Arc Testnet</p>
          </div>
          <ConnectButton />
        </div>

        {!isConnected ? (
          /* Not connected screen */
          <div style={{ textAlign: 'center', marginTop: '8rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⬡</div>
            <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>Welcome to ArcFi</h2>
            <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '2rem' }}>Connect your wallet to start lending, borrowing and swapping on Arc Testnet</p>
            <ConnectButton />
          </div>
        ) : (
          <>
            {/* DASHBOARD PAGE */}
            {activePage === 'dashboard' && (
              <div>
                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    { label: 'Total Deposited', value: `$${deposited.toFixed(2)}`, sub: '+4.5% APY', color: '#2563eb', bg: '#eff6ff' },
                    { label: 'Total Borrowed', value: `$${borrowed.toFixed(2)}`, sub: '8.2% APR', color: '#7c3aed', bg: '#f5f3ff' },
                    { label: 'Interest Earned', value: `$${interest.toFixed(4)}`, sub: 'Accruing live', color: '#059669', bg: '#ecfdf5' },
                    { label: 'Health Factor', value: `${healthFactor.toFixed(0)}%`, sub: borrowed === 0 ? 'No debt' : healthFactor > 50 ? 'Safe' : 'At Risk', color: healthFactor > 50 ? '#059669' : '#dc2626', bg: healthFactor > 50 ? '#ecfdf5' : '#fef2f2' },
                  ].map(card => (
                    <div key={card.label} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{card.label}</div>
                      <div style={{ color: card.color, fontSize: '1.6rem', fontWeight: '700' }}>{card.value}</div>
                      <div style={{ background: card.bg, color: card.color, fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '20px', display: 'inline-block', marginTop: '0.5rem' }}>{card.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Health Factor Bar */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>Health Factor</span>
                    <span style={{ color: healthFactor > 50 ? '#059669' : '#dc2626', fontWeight: '700' }}>{healthFactor.toFixed(0)}%</span>
                  </div>
                  <div style={{ background: '#e2e8f0', borderRadius: '99px', height: '10px' }}>
                    <div style={{ background: healthFactor > 70 ? '#059669' : healthFactor > 40 ? '#f59e0b' : '#dc2626', width: `${Math.min(healthFactor, 100)}%`, height: '10px', borderRadius: '99px', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span>Liquidation risk</span>
                    <span>Safe zone</span>
                  </div>
                </div>

                {/* Transaction History */}
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontWeight: '600', color: '#0f172a' }}>Transaction History</h3>
                  </div>
                  {transactions.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No transactions yet</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Type', 'Amount', 'Token', 'Time', 'Status'].map(h => (
                            <th key={h} style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map(tx => (
                          <tr key={tx.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#0f172a' }}>{tx.type}</td>
                            <td style={{ padding: '1rem 1.5rem', color: '#2563eb', fontWeight: '600' }}>{tx.amount}</td>
                            <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{tx.token}</td>
                            <td style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>{tx.time}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <span style={{ background: '#ecfdf5', color: '#059669', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>{tx.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* LEND PAGE */}
            {activePage === 'lend' && (
              <div style={{ maxWidth: '600px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Deposit USDC</h2>
                  <p style={{ color: '#94a3b8', margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>Earn 4.5% APY on your USDC deposits</p>

                  {/* APY Badge */}
                  <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#2563eb', fontWeight: '600' }}>Current APY</span>
                    <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '1.2rem' }}>4.50%</span>
                  </div>

                  {/* Quick amounts */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {['10', '50', '100', '500'].map(amt => (
                      <button key={amt} onClick={() => setLendAmount(amt)}
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: lendAmount === amt ? '#2563eb' : 'white', color: lendAmount === amt ? 'white' : '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                        ${amt}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={lendAmount}
                    onChange={e => setLendAmount(e.target.value)}
                    style={{ width: '100%', padding: '0.9rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', marginBottom: '1rem', outline: 'none', boxSizing: 'border-box' }}
                  />

                  <button
                    onClick={() => {
                      if (!lendAmount || Number(lendAmount) <= 0) return
                      setDeposited(d => d + Number(lendAmount))
                      addTx('Deposit', lendAmount, 'USDC')
                      showToast(`✅ Deposited ${lendAmount} USDC!`)
                      setLendAmount('')
                    }}
                    style={{ width: '100%', padding: '1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Deposit USDC
                  </button>
                </div>

                {/* Your position */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Your Position</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#94a3b8' }}>Deposited</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>${deposited.toFixed(2)} USDC</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Interest Earned</span>
                    <span style={{ fontWeight: '700', color: '#059669' }}>${interest.toFixed(4)} USDC</span>
                  </div>
                </div>
              </div>
            )}

            {/* BORROW PAGE */}
            {activePage === 'borrow' && (
              <div style={{ maxWidth: '600px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Borrow USDC</h2>
                  <p style={{ color: '#94a3b8', margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>You can borrow up to 80% of your deposited amount</p>

                  {/* Borrow limit */}
                  <div style={{ background: '#f5f3ff', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7c3aed', fontWeight: '600' }}>Borrow Limit</span>
                    <span style={{ color: '#7c3aed', fontWeight: '800', fontSize: '1.2rem' }}>${(deposited * 0.8).toFixed(2)} USDC</span>
                  </div>

                  {/* Quick amounts */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {['25%', '50%', '75%', 'MAX'].map(pct => (
                      <button key={pct} onClick={() => {
                        const multiplier = pct === 'MAX' ? 0.8 : parseFloat(pct) / 100 * 0.8
                        setBorrowAmount((deposited * multiplier).toFixed(2))
                      }}
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', color: '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                        {pct}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={borrowAmount}
                    onChange={e => setBorrowAmount(e.target.value)}
                    style={{ width: '100%', padding: '0.9rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', marginBottom: '1rem', outline: 'none', boxSizing: 'border-box' }}
                  />

                  {/* Health factor preview */}
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8' }}>Health Factor after borrow</span>
                      <span style={{ color: '#0f172a', fontWeight: '600' }}>
                        {deposited > 0 ? `${Math.max(0, ((deposited - borrowed - Number(borrowAmount || 0)) / deposited * 100)).toFixed(0)}%` : 'N/A'}
                      </span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: '99px', height: '8px' }}>
                      <div style={{
                        background: '#7c3aed',
                        width: deposited > 0 ? `${Math.min(Math.max(0, ((deposited - borrowed - Number(borrowAmount || 0)) / deposited * 100)), 100)}%` : '0%',
                        height: '8px', borderRadius: '99px', transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!borrowAmount || Number(borrowAmount) <= 0) return
                      if (Number(borrowAmount) > deposited * 0.8 - borrowed) {
                        showToast('❌ Exceeds borrow limit!')
                        return
                      }
                      setBorrowed(b => b + Number(borrowAmount))
                      addTx('Borrow', borrowAmount, 'USDC')
                      showToast(`✅ Borrowed ${borrowAmount} USDC!`)
                      setBorrowAmount('')
                    }}
                    style={{ width: '100%', padding: '1rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Borrow USDC
                  </button>
                </div>

                {/* Borrow position */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Your Borrow Position</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#94a3b8' }}>Borrowed</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>${borrowed.toFixed(2)} USDC</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>APR</span>
                    <span style={{ fontWeight: '700', color: '#dc2626' }}>8.20%</span>
                  </div>
                </div>
              </div>
            )}

            {/* SWAP PAGE */}
            {activePage === 'swap' && (
              <div style={{ maxWidth: '480px' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', border: '1px solid #e2e8f0' }}>
                  <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Swap Tokens</h2>
                  <p style={{ color: '#94a3b8', margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>Instant swaps on Arc Testnet</p>

                  {/* From */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>From</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <input
                        type="number"
                        placeholder="0.0"
                        value={swapAmount}
                        onChange={e => setSwapAmount(e.target.value)}
                        style={{ background: 'none', border: 'none', fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', outline: 'none', width: '60%' }}
                      />
                      <select value={swapFrom} onChange={e => setSwapFrom(e.target.value)}
                        style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 0.75rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <option>USDC</option>
                        <option>EURC</option>
                        <option>ETH</option>
                      </select>
                    </div>
                  </div>

                  {/* Swap Arrow */}
                  <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                    <button onClick={() => { setSwapFrom(swapTo); setSwapTo(swapFrom) }}
                      style={{ background: '#eff6ff', border: '1px solid #e2e8f0', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1rem' }}>
                      ↕
                    </button>
                  </div>

                  {/* To */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>To</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
                        {swapAmount ? (Number(swapAmount) * 0.92).toFixed(2) : '0.0'}
                      </div>
                      <select value={swapTo} onChange={e => setSwapTo(e.target.value)}
                        style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 0.75rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <option>EURC</option>
                        <option>USDC</option>
                        <option>ETH</option>
                      </select>
                    </div>
                  </div>

                  {/* Rate info */}
                  {swapAmount && (
                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                        <span>Rate</span>
                        <span>1 {swapFrom} = 0.92 {swapTo}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginTop: '0.25rem' }}>
                        <span>Fee</span>
                        <span>0.3%</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (!swapAmount || Number(swapAmount) <= 0) return
                      addTx('Swap', swapAmount, `${swapFrom} → ${swapTo}`)
                      showToast(`✅ Swapped ${swapAmount} ${swapFrom} to ${swapTo}!`)
                      setSwapAmount('')
                    }}
                    style={{ width: '100%', padding: '1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Swap
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#0f172a', color: 'white', padding: '1rem 1.5rem', borderRadius: '12px', fontWeight: '600', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}