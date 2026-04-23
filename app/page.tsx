'use client'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { useState, useRef } from 'react'
import { parseUnits, formatUnits } from 'viem'

const CONTRACT_ADDRESS = '0xE425c320C07573623C6287C30B8Ee936F6977B63'
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

const LENDING_ABI = [
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'borrow', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'repay', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'getDeposit', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getBorrow', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const

const USDC_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const

const TOKENS = ['USDC', 'EURC', 'ETH', 'WBTC', 'LINK', 'UNI', 'AAVE']
const TOKEN_COLORS: Record<string, string> = {
  USDC: '#2775CA', EURC: '#4B9CD3', ETH: '#627EEA',
  WBTC: '#F7931A', LINK: '#2A5ADA', UNI: '#FF007A', AAVE: '#B6509E'
}
const TOKEN_ICONS: Record<string, string> = {
  USDC: '💵', EURC: '💶', ETH: '⟠', WBTC: '₿', LINK: '🔗', UNI: '🦄', AAVE: '👻'
}

type ActivePage = 'dashboard' | 'lend' | 'borrow' | 'swap' | 'nft' | 'history'

type NFT = {
  id: number
  name: string
  image: string
  imageType: 'emoji' | 'url' | 'upload'
  price: string
  owner: string
  listed: boolean
  description: string
}

type Transaction = {
  id: number
  type: string
  amount: string
  token: string
  time: string
  date: string
  status: string
  hash: string
}

const SAMPLE_NFTS: NFT[] = [
  { id: 1, name: 'Arc Genesis #001', image: '🌌', imageType: 'emoji', price: '100', owner: '0xef6...f64', listed: true, description: 'The first NFT on Arc Network' },
  { id: 2, name: 'Neon Phantom #042', image: '👾', imageType: 'emoji', price: '250', owner: '0xab3...c12', listed: true, description: 'A rare neon phantom from the Arc universe' },
  { id: 3, name: 'Cyber Ape #007', image: '🦍', imageType: 'emoji', price: '500', owner: '0xcd5...e89', listed: true, description: 'Cyber ape from the digital jungle' },
  { id: 4, name: 'Arc Dragon #013', image: '🐉', imageType: 'emoji', price: '750', owner: '0xf12...a45', listed: true, description: 'Legendary dragon of the Arc blockchain' },
  { id: 5, name: 'Pixel Punk #099', image: '🤖', imageType: 'emoji', price: '180', owner: '0x789...b23', listed: true, description: 'Classic pixel punk on Arc Testnet' },
  { id: 6, name: 'Void Walker #055', image: '👁️', imageType: 'emoji', price: '320', owner: '0x456...d67', listed: true, description: 'Walker of the void dimension' },
]

export default function Home() {
  const { isConnected, address } = useAccount()
  const [activePage, setActivePage] = useState<ActivePage>('dashboard')
  const [lendAmount, setLendAmount] = useState('')
  const [borrowAmount, setBorrowAmount] = useState('')
  const [swapFrom, setSwapFrom] = useState('USDC')
  const [swapTo, setSwapTo] = useState('ETH')
  const [swapAmount, setSwapAmount] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [nfts, setNfts] = useState<NFT[]>(SAMPLE_NFTS)
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null)
  const [mintName, setMintName] = useState('')
  const [mintDesc, setMintDesc] = useState('')
  const [mintPrice, setMintPrice] = useState('')
  const [mintImageUrl, setMintImageUrl] = useState('')
  const [mintImagePreview, setMintImagePreview] = useState('')
  const [mintImageMode, setMintImageMode] = useState<'upload' | 'url'>('upload')
  const [activeTab, setActiveTab] = useState<'gallery' | 'create' | 'mynfts'>('gallery')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showTxPopup, setShowTxPopup] = useState(false)
  const [pendingTx, setPendingTx] = useState<{type: string, amount: string, token: string} | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { writeContract } = useWriteContract()

  const { data: depositedRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: LENDING_ABI,
    functionName: 'getDeposit',
    args: [address!],
    query: { enabled: !!address }
  })

  const { data: borrowedRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: LENDING_ABI,
    functionName: 'getBorrow',
    args: [address!],
    query: { enabled: !!address }
  })

  const deposited = depositedRaw ? Number(formatUnits(depositedRaw, 6)) : 0
  const borrowed = borrowedRaw ? Number(formatUnits(borrowedRaw, 6)) : 0
  const interest = deposited * 0.045
  const healthFactor = borrowed === 0 ? 100 : ((deposited - borrowed) / deposited) * 100

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  const addTx = (type: string, amount: string, token: string) => {
    const hash = '0x' + Math.random().toString(16).slice(2, 12) + '...' + Math.random().toString(16).slice(2, 6)
    setTransactions(prev => [{
      id: Date.now(), type, amount, token,
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      status: 'Success', hash
    }, ...prev])
  }

  const showTxConfirm = (type: string, amount: string, token: string) => {
    setPendingTx({ type, amount, token })
    setShowTxPopup(true)
  }

  const confirmTx = () => {
    if (!pendingTx) return
    addTx(pendingTx.type, pendingTx.amount, pendingTx.token)
    showToast(`✅ ${pendingTx.type} of ${pendingTx.amount} ${pendingTx.token} confirmed!`)
    setShowTxPopup(false)
    setPendingTx(null)
  }

  const handleDeposit = async () => {
    if (!lendAmount || Number(lendAmount) <= 0) return
    try {
      const amount = parseUnits(lendAmount, 6)
      writeContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve', args: [CONTRACT_ADDRESS, amount] })
      writeContract({ address: CONTRACT_ADDRESS, abi: LENDING_ABI, functionName: 'deposit', args: [amount] })
      showTxConfirm('Deposit', lendAmount, 'USDC')
      setLendAmount('')
    } catch { showToast('❌ Transaction failed!', 'error') }
  }

  const handleBorrow = async () => {
    if (!borrowAmount || Number(borrowAmount) <= 0) return
    try {
      const amount = parseUnits(borrowAmount, 6)
      writeContract({ address: CONTRACT_ADDRESS, abi: LENDING_ABI, functionName: 'borrow', args: [amount] })
      showTxConfirm('Borrow', borrowAmount, 'USDC')
      setBorrowAmount('')
    } catch { showToast('❌ Transaction failed!', 'error') }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setMintImagePreview(result)
    }
    reader.readAsDataURL(file)
  }

  const handleMintNFT = () => {
    if (!mintName || !mintPrice) {
      showToast('❌ Please fill in name and price!', 'error')
      return
    }
    const imageToUse = mintImagePreview || mintImageUrl || ['🎨', '🌟', '💎', '🔮', '⚡', '🌊'][Math.floor(Math.random() * 6)]
    const isEmoji = !mintImagePreview && !mintImageUrl
    const newNFT: NFT = {
      id: nfts.length + 1,
      name: mintName,
      image: imageToUse,
      imageType: mintImagePreview ? 'upload' : mintImageUrl ? 'url' : 'emoji',
      price: mintPrice,
      owner: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x???',
      listed: true,
      description: mintDesc || 'My custom NFT on Arc Testnet'
    }
    setNfts(prev => [newNFT, ...prev])
    showTxConfirm('Mint NFT', mintPrice, mintName)
    setMintName('')
    setMintDesc('')
    setMintPrice('')
    setMintImageUrl('')
    setMintImagePreview('')
  }

  const handleBuyNFT = (nft: NFT) => {
    showTxConfirm('Buy NFT', nft.price, nft.name)
    setSelectedNft(null)
  }

  const renderNFTImage = (nft: NFT, size: number = 80) => {
    if (nft.imageType === 'emoji') {
      return <div style={{ fontSize: `${size * 0.5}px`, textAlign: 'center', padding: '1rem', background: '#0a0a0f', borderRadius: '12px', marginBottom: '1rem', height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{nft.image}</div>
    }
    return <img src={nft.image} alt={nft.name} style={{ width: '100%', height: `${size}px`, objectFit: 'cover', borderRadius: '12px', marginBottom: '1rem' }} />
  }

  const navItems: { id: ActivePage; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'lend', icon: '💰', label: 'Lend' },
    { id: 'borrow', icon: '🏦', label: 'Borrow' },
    { id: 'swap', icon: '🔄', label: 'Swap' },
    { id: 'nft', icon: '🖼️', label: 'NFT Market' },
    { id: 'history', icon: '📜', label: 'History' },
  ]

  const s = {
    page: { display: 'flex', minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Inter', sans-serif", color: '#e2e8f0' } as React.CSSProperties,
    sidebar: { width: sidebarOpen ? '240px' : '70px', background: '#0f0f1a', borderRight: '1px solid #1e1e3f', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', transition: 'width 0.3s', zIndex: 100, overflow: 'hidden' } as React.CSSProperties,
    main: { marginLeft: sidebarOpen ? '240px' : '70px', flex: 1, padding: '2rem', transition: 'margin-left 0.3s', minHeight: '100vh' } as React.CSSProperties,
    card: { background: '#0f0f1a', border: '1px solid #1e1e3f', borderRadius: '16px', padding: '1.5rem' } as React.CSSProperties,
    input: { width: '100%', padding: '0.9rem 1rem', background: '#0a0a0f', border: '1px solid #2d2d5e', borderRadius: '10px', color: '#e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
    btnPrimary: { width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' } as React.CSSProperties,
    btnSecondary: { padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid #7c3aed', color: '#a78bfa', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' } as React.CSSProperties,
    badge: (color: string) => ({ background: color + '22', color, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' } as React.CSSProperties),
  }

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', cursor: 'pointer' }} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <div style={{ fontSize: '1.5rem', minWidth: '32px' }}>⬡</div>
          {sidebarOpen && <div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ArcFi</div>
            <div style={{ fontSize: '0.7rem', color: '#4a4a8a' }}>Onchain Finance</div>
          </div>}
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer', marginBottom: '0.35rem', background: activePage === item.id ? 'linear-gradient(135deg, #7c3aed22, #4f46e522)' : 'transparent', color: activePage === item.id ? '#a78bfa' : '#4a4a8a', fontWeight: activePage === item.id ? '600' : '400', fontSize: '0.9rem', textAlign: 'left', borderLeft: activePage === item.id ? '2px solid #7c3aed' : '2px solid transparent', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '1.1rem', minWidth: '20px' }}>{item.icon}</span>
              {sidebarOpen && item.label}
            </button>
          ))}
        </nav>

        {/* Faucet Button */}
        <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '10px', background: '#34d39922', border: '1px solid #34d39944', color: '#34d399', fontWeight: '700', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '0.75rem', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '1.1rem', minWidth: '20px' }}>🚰</span>
          {sidebarOpen && 'Claim Testnet USDC'}
        </a>

        {sidebarOpen && (
          <div style={{ background: '#7c3aed11', border: '1px solid #7c3aed33', borderRadius: '10px', padding: '0.75rem', fontSize: '0.75rem' }}>
            <div style={{ color: '#a78bfa', fontWeight: '600', marginBottom: '0.25rem' }}>🟢 Arc Testnet</div>
            <div style={{ color: '#4a4a8a' }}>Chain ID: 5042002</div>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={s.main}>
        {/* Topbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: '#0f0f1a', border: '1px solid #1e1e3f', borderRadius: '16px', padding: '1rem 1.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: '#e2e8f0' }}>
              {navItems.find(n => n.id === activePage)?.icon} {navItems.find(n => n.id === activePage)?.label}
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', color: '#4a4a8a', fontSize: '0.8rem' }}>Arc Testnet · {new Date().toLocaleDateString()}</p>
          </div>
          <ConnectButton />
        </div>

        {!isConnected ? (
          <div style={{ textAlign: 'center', marginTop: '6rem' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>⬡</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem' }}>Welcome to ArcFi</h2>
            <p style={{ color: '#4a4a8a', fontSize: '1.1rem', marginBottom: '2.5rem' }}>The next generation DeFi + NFT platform on Arc Testnet</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem', flexWrap: 'wrap' }}>
              {['💰 Lend & Earn', '🏦 Borrow', '🔄 Swap 7 Tokens', '🖼️ NFT Market', '🚰 Free Faucet'].map(f => (
                <div key={f} style={{ background: '#0f0f1a', border: '1px solid #1e1e3f', borderRadius: '12px', padding: '1rem 1.5rem', color: '#a78bfa', fontSize: '0.9rem', fontWeight: '600' }}>{f}</div>
              ))}
            </div>
            <ConnectButton />
          </div>
        ) : (
          <>
            {/* DASHBOARD */}
            {activePage === 'dashboard' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Deposited', value: `$${deposited.toFixed(2)}`, sub: '4.5% APY', color: '#60a5fa', icon: '💰' },
                    { label: 'Borrowed', value: `$${borrowed.toFixed(2)}`, sub: '8.2% APR', color: '#a78bfa', icon: '🏦' },
                    { label: 'Interest', value: `$${interest.toFixed(4)}`, sub: 'Earned', color: '#34d399', icon: '📈' },
                    { label: 'Health', value: `${healthFactor.toFixed(0)}%`, sub: borrowed === 0 ? 'No debt' : healthFactor > 50 ? 'Safe ✅' : 'Risk ⚠️', color: healthFactor > 50 ? '#34d399' : '#f87171', icon: '❤️' },
                  ].map(card => (
                    <div key={card.label} style={{ ...s.card, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '-20px', right: '-10px', fontSize: '4rem', opacity: 0.05 }}>{card.icon}</div>
                      <div style={{ color: '#4a4a8a', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: '500' }}>{card.label}</div>
                      <div style={{ color: card.color, fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.5rem' }}>{card.value}</div>
                      <div style={s.badge(card.color)}>{card.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={{ ...s.card, marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: '600' }}>Portfolio Health</span>
                    <span style={{ color: healthFactor > 50 ? '#34d399' : '#f87171', fontWeight: '700' }}>{healthFactor.toFixed(0)}%</span>
                  </div>
                  <div style={{ background: '#1e1e3f', borderRadius: '99px', height: '12px', overflow: 'hidden' }}>
                    <div style={{ background: `linear-gradient(90deg, ${healthFactor > 70 ? '#34d399' : healthFactor > 40 ? '#fbbf24' : '#f87171'}, ${healthFactor > 70 ? '#059669' : healthFactor > 40 ? '#f59e0b' : '#dc2626'})`, width: `${Math.min(healthFactor, 100)}%`, height: '12px', borderRadius: '99px', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: '#4a4a8a' }}>
                    <span>⚠️ Liquidation Zone</span>
                    <span>✅ Safe Zone</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Quick Deposit', action: () => setActivePage('lend'), color: '#60a5fa', icon: '💰' },
                    { label: 'Browse NFTs', action: () => setActivePage('nft'), color: '#f472b6', icon: '🖼️' },
                    { label: 'Claim Faucet', action: () => window.open('https://faucet.circle.com', '_blank'), color: '#34d399', icon: '🚰' },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      style={{ ...s.card, border: `1px solid ${item.color}33`, cursor: 'pointer', textAlign: 'center', color: item.color, fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      {item.icon} {item.label}
                    </button>
                  ))}
                </div>

                <div style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontWeight: '600' }}>Recent Transactions</h3>
                    <button onClick={() => setActivePage('history')} style={s.btnSecondary}>View All</button>
                  </div>
                  {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#4a4a8a' }}>No transactions yet. Start by depositing!</div>
                  ) : transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #1e1e3f' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1e1e3f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                          {tx.type === 'Deposit' ? '💰' : tx.type === 'Borrow' ? '🏦' : tx.type.includes('NFT') ? '🖼️' : '🔄'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{tx.type}</div>
                          <div style={{ color: '#4a4a8a', fontSize: '0.75rem' }}>{tx.hash}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#a78bfa', fontWeight: '700' }}>{tx.amount} {tx.token}</div>
                        <div style={{ color: '#4a4a8a', fontSize: '0.75rem' }}>{tx.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LEND */}
            {activePage === 'lend' && (
              <div style={{ maxWidth: '580px' }}>
                <div style={{ ...s.card, marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa' }}>💰 Deposit USDC</h2>
                  <p style={{ color: '#4a4a8a', margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>Earn 4.5% APY on your deposits</p>
                  <div style={{ background: '#60a5fa11', border: '1px solid #60a5fa33', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#4a4a8a', fontSize: '0.8rem' }}>Current APY</div>
                      <div style={{ color: '#60a5fa', fontSize: '1.8rem', fontWeight: '800' }}>4.50%</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#4a4a8a', fontSize: '0.8rem' }}>Your Deposit</div>
                      <div style={{ color: '#60a5fa', fontSize: '1.4rem', fontWeight: '700' }}>${deposited.toFixed(2)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {['10', '50', '100', '500'].map(amt => (
                      <button key={amt} onClick={() => setLendAmount(amt)}
                        style={{ flex: 1, padding: '0.6rem', border: `1px solid ${lendAmount === amt ? '#60a5fa' : '#1e1e3f'}`, borderRadius: '8px', background: lendAmount === amt ? '#60a5fa22' : 'transparent', color: lendAmount === amt ? '#60a5fa' : '#4a4a8a', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <input style={{ ...s.input, marginBottom: '1rem' }} type="number" placeholder="Enter USDC amount" value={lendAmount} onChange={e => setLendAmount(e.target.value)} />
                  <button style={s.btnPrimary} onClick={handleDeposit}>Deposit USDC → Arc Testnet</button>
                </div>
                <div style={s.card}>
                  <h3 style={{ margin: '0 0 1rem 0' }}>Your Position</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #1e1e3f' }}>
                    <span style={{ color: '#4a4a8a' }}>Deposited</span>
                    <span style={{ color: '#60a5fa', fontWeight: '700' }}>${deposited.toFixed(2)} USDC</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
                    <span style={{ color: '#4a4a8a' }}>Interest Earned</span>
                    <span style={{ color: '#34d399', fontWeight: '700' }}>${interest.toFixed(4)} USDC</span>
                  </div>
                </div>
              </div>
            )}

            {/* BORROW */}
            {activePage === 'borrow' && (
              <div style={{ maxWidth: '580px' }}>
                <div style={{ ...s.card, marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: '0 0 0.5rem 0', color: '#a78bfa' }}>🏦 Borrow USDC</h2>
                  <p style={{ color: '#4a4a8a', margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>Borrow up to 80% of your collateral</p>
                  <div style={{ background: '#a78bfa11', border: '1px solid #a78bfa33', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#4a4a8a', fontSize: '0.8rem' }}>Borrow Limit</div>
                      <div style={{ color: '#a78bfa', fontSize: '1.8rem', fontWeight: '800' }}>${(deposited * 0.8).toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#4a4a8a', fontSize: '0.8rem' }}>Already Borrowed</div>
                      <div style={{ color: '#f87171', fontSize: '1.4rem', fontWeight: '700' }}>${borrowed.toFixed(2)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {['25%', '50%', '75%', 'MAX'].map(pct => (
                      <button key={pct} onClick={() => {
                        const m = pct === 'MAX' ? 0.8 : parseFloat(pct) / 100 * 0.8
                        setBorrowAmount((deposited * m).toFixed(2))
                      }}
                        style={{ flex: 1, padding: '0.6rem', border: '1px solid #1e1e3f', borderRadius: '8px', background: 'transparent', color: '#a78bfa', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                        {pct}
                      </button>
                    ))}
                  </div>
                  <input style={{ ...s.input, marginBottom: '1rem' }} type="number" placeholder="Enter USDC amount" value={borrowAmount} onChange={e => setBorrowAmount(e.target.value)} />
                  <button style={{ ...s.btnPrimary, background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }} onClick={handleBorrow}>Borrow USDC</button>
                </div>
                <div style={s.card}>
                  <h3 style={{ margin: '0 0 1rem 0' }}>Borrow Position</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #1e1e3f' }}>
                    <span style={{ color: '#4a4a8a' }}>Borrowed</span>
                    <span style={{ color: '#a78bfa', fontWeight: '700' }}>${borrowed.toFixed(2)} USDC</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
                    <span style={{ color: '#4a4a8a' }}>APR</span>
                    <span style={{ color: '#f87171', fontWeight: '700' }}>8.20%</span>
                  </div>
                </div>
              </div>
            )}

            {/* SWAP */}
            {activePage === 'swap' && (
              <div style={{ maxWidth: '480px' }}>
                <div style={s.card}>
                  <h2 style={{ margin: '0 0 0.5rem 0', color: '#34d399' }}>🔄 Swap Tokens</h2>
                  <p style={{ color: '#4a4a8a', margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>Swap between 7 tokens instantly</p>
                  <div style={{ background: '#0a0a0f', border: '1px solid #1e1e3f', borderRadius: '12px', padding: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#4a4a8a', marginBottom: '0.75rem' }}>From</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <input type="number" placeholder="0.0" value={swapAmount} onChange={e => setSwapAmount(e.target.value)}
                        style={{ background: 'none', border: 'none', fontSize: '2rem', fontWeight: '800', color: '#e2e8f0', outline: 'none', width: '55%' }} />
                      <select value={swapFrom} onChange={e => setSwapFrom(e.target.value)}
                        style={{ background: '#1e1e3f', color: TOKEN_COLORS[swapFrom], border: `1px solid ${TOKEN_COLORS[swapFrom]}44`, borderRadius: '10px', padding: '0.6rem 1rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' }}>
                        {TOKENS.map(t => <option key={t} value={t}>{TOKEN_ICONS[t]} {t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                    <button onClick={() => { const tmp = swapFrom; setSwapFrom(swapTo); setSwapTo(tmp) }}
                      style={{ background: '#1e1e3f', border: '1px solid #2d2d5e', borderRadius: '50%', width: '42px', height: '42px', cursor: 'pointer', fontSize: '1.2rem', color: '#a78bfa' }}>↕</button>
                  </div>
                  <div style={{ background: '#0a0a0f', border: '1px solid #1e1e3f', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#4a4a8a', marginBottom: '0.75rem' }}>To</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '800', color: '#34d399' }}>
                        {swapAmount ? (Number(swapAmount) * 0.992).toFixed(4) : '0.0'}
                      </div>
                      <select value={swapTo} onChange={e => setSwapTo(e.target.value)}
                        style={{ background: '#1e1e3f', color: TOKEN_COLORS[swapTo], border: `1px solid ${TOKEN_COLORS[swapTo]}44`, borderRadius: '10px', padding: '0.6rem 1rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' }}>
                        {TOKENS.filter(t => t !== swapFrom).map(t => <option key={t} value={t}>{TOKEN_ICONS[t]} {t}</option>)}
                      </select>
                    </div>
                  </div>
                  {swapAmount && (
                    <div style={{ background: '#1e1e3f', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
                      {[['Rate', `1 ${swapFrom} = 0.992 ${swapTo}`], ['Price Impact', '< 0.01%'], ['Fee', '0.3%'], ['Slippage', '0.5%']].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: '#4a4a8a', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                          <span>{k}</span><span style={{ color: '#a78bfa' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button style={{ ...s.btnPrimary, background: 'linear-gradient(135deg, #34d399, #059669)' }}
                    onClick={() => {
                      if (!swapAmount || Number(swapAmount) <= 0) return
                      showTxConfirm('Swap', swapAmount, `${swapFrom} → ${swapTo}`)
                      setSwapAmount('')
                    }}>
                    Swap {swapFrom} → {swapTo}
                  </button>
                </div>
              </div>
            )}

            {/* NFT MARKETPLACE */}
            {activePage === 'nft' && (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {[
                    { id: 'gallery' as const, label: '🖼️ Gallery' },
                    { id: 'create' as const, label: '🎨 Create NFT' },
                    { id: 'mynfts' as const, label: '👤 My NFTs' },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      style={{ padding: '0.6rem 1.2rem', border: `1px solid ${activeTab === tab.id ? '#a78bfa' : '#1e1e3f'}`, borderRadius: '10px', background: activeTab === tab.id ? '#a78bfa22' : 'transparent', color: activeTab === tab.id ? '#a78bfa' : '#4a4a8a', cursor: 'pointer', fontWeight: '600' }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'gallery' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    {nfts.filter(n => n.listed).map(nft => (
                      <div key={nft.id} onClick={() => setSelectedNft(nft)}
                        style={{ ...s.card, cursor: 'pointer', transition: 'transform 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                        {renderNFTImage(nft, 120)}
                        <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{nft.name}</div>
                        <div style={{ color: '#4a4a8a', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Owner: {nft.owner}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ color: '#a78bfa', fontWeight: '800', fontSize: '1.1rem' }}>{nft.price} USDC</div>
                          <button onClick={e => { e.stopPropagation(); handleBuyNFT(nft) }}
                            style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>
                            Buy
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'create' && (
                  <div style={{ maxWidth: '500px' }}>
                    <div style={s.card}>
                      <h2 style={{ margin: '0 0 1.5rem 0', color: '#f472b6' }}>🎨 Mint Your NFT</h2>

                      {/* Image Upload Section */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ color: '#4a4a8a', fontSize: '0.85rem', display: 'block', marginBottom: '0.75rem' }}>NFT Image</label>

                        {/* Toggle */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                          {[
                            { id: 'upload' as const, label: '📁 Upload File' },
                            { id: 'url' as const, label: '🔗 Image URL' },
                          ].map(tab => (
                            <button key={tab.id} onClick={() => { setMintImageMode(tab.id); setMintImagePreview(''); setMintImageUrl('') }}
                              style={{ flex: 1, padding: '0.5rem', border: `1px solid ${mintImageMode === tab.id ? '#f472b6' : '#1e1e3f'}`, borderRadius: '8px', background: mintImageMode === tab.id ? '#f472b622' : 'transparent', color: mintImageMode === tab.id ? '#f472b6' : '#4a4a8a', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Upload */}
                        {mintImageMode === 'upload' && (
                          <div>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                            <div onClick={() => fileInputRef.current?.click()}
                              style={{ border: '2px dashed #2d2d5e', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', color: '#4a4a8a', background: '#0a0a0f' }}>
                              {mintImagePreview ? (
                                <img src={mintImagePreview} alt="Preview" style={{ maxHeight: '150px', borderRadius: '8px', maxWidth: '100%' }} />
                              ) : (
                                <div>
                                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                                  <div style={{ fontSize: '0.85rem' }}>Click to upload image</div>
                                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#2d2d5e' }}>PNG, JPG, GIF supported</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* URL */}
                        {mintImageMode === 'url' && (
                          <div>
                            <input style={{ ...s.input, marginBottom: '0.75rem' }} placeholder="https://example.com/image.png" value={mintImageUrl} onChange={e => setMintImageUrl(e.target.value)} />
                            {mintImageUrl && (
                              <img src={mintImageUrl} alt="Preview" style={{ maxHeight: '150px', borderRadius: '8px', maxWidth: '100%' }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ color: '#4a4a8a', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>NFT Name *</label>
                        <input style={s.input} placeholder="e.g. My Arc Genesis #001" value={mintName} onChange={e => setMintName(e.target.value)} />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ color: '#4a4a8a', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>Description</label>
                        <input style={s.input} placeholder="Describe your NFT..." value={mintDesc} onChange={e => setMintDesc(e.target.value)} />
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ color: '#4a4a8a', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>Price (USDC) *</label>
                        <input style={s.input} type="number" placeholder="e.g. 100" value={mintPrice} onChange={e => setMintPrice(e.target.value)} />
                      </div>
                      <button style={{ ...s.btnPrimary, background: 'linear-gradient(135deg, #f472b6, #a78bfa)' }} onClick={handleMintNFT}>
                        🎨 Mint NFT
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'mynfts' && (
                  <div>
                    {nfts.filter(n => n.owner === (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '')).length === 0 ? (
                      <div style={{ ...s.card, textAlign: 'center', padding: '3rem', color: '#4a4a8a' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</div>
                        <p>You don't own any NFTs yet!</p>
                        <button style={{ ...s.btnSecondary, marginTop: '1rem' }} onClick={() => setActiveTab('create')}>Mint Your First NFT</button>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        {nfts.filter(n => n.owner === `${address?.slice(0, 6)}...${address?.slice(-4)}`).map(nft => (
                          <div key={nft.id} style={s.card}>
                            {renderNFTImage(nft, 120)}
                            <div style={{ fontWeight: '700', marginBottom: '0.5rem' }}>{nft.name}</div>
                            <div style={{ color: '#a78bfa', fontWeight: '700' }}>{nft.price} USDC</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* NFT Detail Modal */}
                {selectedNft && (
                  <div style={{ position: 'fixed', inset: 0, background: '#000000cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedNft(null)}>
                    <div style={{ background: '#0f0f1a', border: '1px solid #1e1e3f', borderRadius: '20px', padding: '2rem', maxWidth: '420px', width: '90%' }} onClick={e => e.stopPropagation()}>
                      {renderNFTImage(selectedNft, 200)}
                      <h2 style={{ margin: '0 0 0.5rem 0', textAlign: 'center' }}>{selectedNft.name}</h2>
                      <p style={{ color: '#4a4a8a', textAlign: 'center', marginBottom: '1.5rem' }}>{selectedNft.description}</p>
                      <div style={{ background: '#0a0a0f', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: '#4a4a8a' }}>Owner</span>
                          <span style={{ color: '#a78bfa' }}>{selectedNft.owner}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#4a4a8a' }}>Price</span>
                          <span style={{ color: '#a78bfa', fontWeight: '800', fontSize: '1.2rem' }}>{selectedNft.price} USDC</span>
                        </div>
                      </div>
                      <button style={s.btnPrimary} onClick={() => handleBuyNFT(selectedNft)}>Buy for {selectedNft.price} USDC</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HISTORY */}
            {activePage === 'history' && (
              <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0 }}>📜 Transaction History</h2>
                  <div style={s.badge('#a78bfa')}>{transactions.length} transactions</div>
                </div>
                {transactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem', color: '#4a4a8a' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📜</div>
                    <p>No transactions yet. Start by depositing USDC!</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1e1e3f' }}>
                        {['Type', 'Amount', 'Token/NFT', 'Hash', 'Date', 'Time', 'Status'].map(h => (
                          <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', color: '#4a4a8a', fontWeight: '600' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.id} style={{ borderBottom: '1px solid #0f0f1a' }}>
                          <td style={{ padding: '1rem', fontWeight: '600' }}>
                            <span style={{ marginRight: '0.5rem' }}>
                              {tx.type === 'Deposit' ? '💰' : tx.type === 'Borrow' ? '🏦' : tx.type.includes('NFT') ? '🖼️' : '🔄'}
                            </span>
                            {tx.type}
                          </td>
                          <td style={{ padding: '1rem', color: '#a78bfa', fontWeight: '700' }}>{tx.amount}</td>
                          <td style={{ padding: '1rem', color: '#4a4a8a', fontSize: '0.85rem' }}>{tx.token}</td>
                          <td style={{ padding: '1rem', color: '#4a4a8a', fontSize: '0.75rem', fontFamily: 'monospace' }}>{tx.hash}</td>
                          <td style={{ padding: '1rem', color: '#4a4a8a', fontSize: '0.85rem' }}>{tx.date}</td>
                          <td style={{ padding: '1rem', color: '#4a4a8a', fontSize: '0.85rem' }}>{tx.time}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={s.badge('#34d399')}>{tx.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* TX Confirmation Popup */}
      {showTxPopup && pendingTx && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000bb', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#0f0f1a', border: '1px solid #7c3aed', borderRadius: '20px', padding: '2rem', maxWidth: '380px', width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              {pendingTx.type === 'Deposit' ? '💰' : pendingTx.type === 'Borrow' ? '🏦' : pendingTx.type.includes('NFT') ? '🖼️' : '🔄'}
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0', color: '#a78bfa' }}>Confirm Transaction</h2>
            <p style={{ color: '#4a4a8a', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Please review your transaction details</p>
            <div style={{ background: '#0a0a0f', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              {[
                ['Type', pendingTx.type],
                ['Amount', pendingTx.amount],
                ['Token', pendingTx.token],
                ['Network', 'Arc Testnet'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span style={{ color: '#4a4a8a' }}>{k}</span>
                  <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setShowTxPopup(false); setPendingTx(null) }}
                style={{ flex: 1, padding: '0.9rem', background: 'transparent', border: '1px solid #2d2d5e', color: '#4a4a8a', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>
                Cancel
              </button>
              <button onClick={confirmTx}
                style={{ flex: 1, padding: '0.9rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>
                Confirm ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: toastType === 'success' ? '#0f0f1a' : '#1a0f0f', border: `1px solid ${toastType === 'success' ? '#34d399' : '#f87171'}`, color: toastType === 'success' ? '#34d399' : '#f87171', padding: '1rem 1.5rem', borderRadius: '12px', fontWeight: '600', zIndex: 9999, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', maxWidth: '320px' }}>
          {toast}
        </div>
      )}
    </div>
  )
}