'use client'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { useState, useRef, useEffect } from 'react'
import { parseUnits, formatUnits } from 'viem'

const CONTRACT_ADDRESS = '0xE425c320C07573623C6287C30B8Ee936F6977B63'
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
const PREDICTION_ADDRESS = '0x78F83274426f429f60B9774251109a1DDcB78C65'

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

const PREDICTION_ABI = [
  { name: 'createMarket', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'question', type: 'string' }, { name: 'opt0', type: 'string' }, { name: 'opt1', type: 'string' }, { name: 'opt2', type: 'string' }, { name: 'opt3', type: 'string' }, { name: 'optionCount', type: 'uint8' }, { name: 'durationInHours', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'placeBet', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'marketId', type: 'uint256' }, { name: 'option', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'resolveMarket', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'marketId', type: 'uint256' }, { name: 'winningOption', type: 'uint256' }], outputs: [] },
  { name: 'claimWinnings', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'marketId', type: 'uint256' }], outputs: [] },
] as const

const TOKENS = ['USDC', 'EURC', 'ETH', 'WBTC', 'LINK', 'UNI', 'AAVE']
const TOKEN_COLORS: Record<string, string> = { USDC: '#2775CA', EURC: '#4B9CD3', ETH: '#627EEA', WBTC: '#F7931A', LINK: '#2A5ADA', UNI: '#FF007A', AAVE: '#B6509E' }
const TOKEN_ICONS: Record<string, string> = { USDC: '💵', EURC: '💶', ETH: '⟠', WBTC: '₿', LINK: '🔗', UNI: '🦄', AAVE: '👻' }

type ActivePage = 'home' | 'dashboard' | 'lend' | 'borrow' | 'swap' | 'nft' | 'history' | 'predict'
type NFT = { id: number; name: string; image: string; imageType: 'emoji' | 'url' | 'upload'; price: string; owner: string; listed: boolean; description: string }
type Transaction = { id: number; type: string; amount: string; token: string; time: string; date: string; status: string; hash: string }
type LocalMarket = { id: number; question: string; options: string[]; optionCount: number; endTime: number; resolved: boolean; winningOption: number; totalPool: number; pools: number[]; creator: string }

const SAMPLE_NFTS: NFT[] = [
  { id: 1, name: 'Arc Genesis #001', image: '🌌', imageType: 'emoji', price: '100', owner: '0xef6...f64', listed: true, description: 'The first NFT on Arc Network' },
  { id: 2, name: 'Neon Phantom #042', image: '👾', imageType: 'emoji', price: '250', owner: '0xab3...c12', listed: true, description: 'A rare neon phantom from the Arc universe' },
  { id: 3, name: 'Cyber Ape #007', image: '🦍', imageType: 'emoji', price: '500', owner: '0xcd5...e89', listed: true, description: 'Cyber ape from the digital jungle' },
  { id: 4, name: 'Arc Dragon #013', image: '🐉', imageType: 'emoji', price: '750', owner: '0xf12...a45', listed: true, description: 'Legendary dragon of the Arc blockchain' },
  { id: 5, name: 'Pixel Punk #099', image: '🤖', imageType: 'emoji', price: '180', owner: '0x789...b23', listed: true, description: 'Classic pixel punk on Arc Testnet' },
  { id: 6, name: 'Void Walker #055', image: '👁️', imageType: 'emoji', price: '320', owner: '0x456...d67', listed: true, description: 'Walker of the void dimension' },
]

const SAMPLE_MARKETS: LocalMarket[] = [
  { id: 0, question: 'Will BTC hit $150k before end of 2025?', options: ['Yes', 'No'], optionCount: 2, endTime: Date.now() / 1000 + 86400 * 7, resolved: false, winningOption: 0, totalPool: 500, pools: [320, 180], creator: '0xef6...f64' },
  { id: 1, question: 'Will Arc Mainnet launch in Q2 2026?', options: ['Yes', 'No'], optionCount: 2, endTime: Date.now() / 1000 + 86400 * 14, resolved: false, winningOption: 0, totalPool: 300, pools: [200, 100], creator: '0xab3...c12' },
  { id: 2, question: 'Which chain will have highest TVL in 2026?', options: ['Ethereum', 'Solana', 'Arc', 'Base'], optionCount: 4, endTime: Date.now() / 1000 + 86400 * 30, resolved: false, winningOption: 0, totalPool: 800, pools: [300, 200, 200, 100], creator: '0xcd5...e89' },
]

const MARQUEE_ITEMS = ['⬡ ARC TESTNET', '💵 USDC', '🔄 SWAP', '🏦 LEND', '💰 BORROW', '🖼️ NFT', '🎯 PREDICT', '⬡ ONCHAIN FINANCE', '💵 EARN 4.5% APY', '🔗 CHAIN ID: 5042002']

export default function Home() {
  const { isConnected, address } = useAccount()
  const [activePage, setActivePage] = useState<ActivePage>('home')
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
  const [showTxPopup, setShowTxPopup] = useState(false)
  const [pendingTx, setPendingTx] = useState<{type: string; amount: string; token: string; onConfirm?: () => void} | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [markets, setMarkets] = useState<LocalMarket[]>(SAMPLE_MARKETS)
  const [predictTab, setPredictTab] = useState<'markets' | 'create' | 'mymarkets'>('markets')
  const [selectedMarket, setSelectedMarket] = useState<LocalMarket | null>(null)
  const [betAmount, setBetAmount] = useState('')
  const [betOption, setBetOption] = useState(0)
  const [newQuestion, setNewQuestion] = useState('')
  const [newOptions, setNewOptions] = useState(['Yes', 'No', '', ''])
  const [newOptionCount, setNewOptionCount] = useState(2)
  const [newDuration, setNewDuration] = useState('24')
  const [resolveOption, setResolveOption] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { writeContract } = useWriteContract()
  const { data: depositedRaw } = useReadContract({ address: CONTRACT_ADDRESS, abi: LENDING_ABI, functionName: 'getDeposit', args: [address!], query: { enabled: !!address } })
  const { data: borrowedRaw } = useReadContract({ address: CONTRACT_ADDRESS, abi: LENDING_ABI, functionName: 'getBorrow', args: [address!], query: { enabled: !!address } })

  const deposited = depositedRaw ? Number(formatUnits(depositedRaw, 18)) : 0
  const borrowed = borrowedRaw ? Number(formatUnits(borrowedRaw, 18)) : 0
  const interest = deposited * 0.045
  const healthFactor = borrowed === 0 ? 100 : ((deposited - borrowed) / deposited) * 100

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3500) }
  const addTx = (type: string, amount: string, token: string) => {
    const hash = '0x' + Math.random().toString(16).slice(2, 12) + '...' + Math.random().toString(16).slice(2, 6)
    setTransactions(prev => [{ id: Date.now(), type, amount, token, time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString(), status: 'Success', hash }, ...prev])
  }
  const showTxConfirm = (type: string, amount: string, token: string, onConfirm?: () => void) => { setPendingTx({ type, amount, token, onConfirm }); setShowTxPopup(true) }
  const confirmTx = () => {
    if (!pendingTx) return
    if (pendingTx.onConfirm) pendingTx.onConfirm()
    addTx(pendingTx.type, pendingTx.amount, pendingTx.token)
    showToast(`✅ ${pendingTx.type} confirmed!`)
    setShowTxPopup(false); setPendingTx(null)
  }

  const handleDeposit = () => {
    if (!lendAmount || Number(lendAmount) <= 0) return
    const amount = parseUnits(lendAmount, 18)
    showTxConfirm('Deposit', lendAmount, 'USDC', () => {
      writeContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve', args: [CONTRACT_ADDRESS, amount] })
      setTimeout(() => writeContract({ address: CONTRACT_ADDRESS, abi: LENDING_ABI, functionName: 'deposit', args: [amount] }), 5000)
    })
    setLendAmount('')
  }

  const handleBorrow = () => {
    if (!borrowAmount || Number(borrowAmount) <= 0) return
    const amount = parseUnits(borrowAmount, 18)
    showTxConfirm('Borrow', borrowAmount, 'USDC', () => { writeContract({ address: CONTRACT_ADDRESS, abi: LENDING_ABI, functionName: 'borrow', args: [amount] }) })
    setBorrowAmount('')
  }

  const handleCreateMarket = () => {
    if (!newQuestion || !newOptions[0] || !newOptions[1]) { showToast('❌ Fill question and at least 2 options!', 'error'); return }
    showTxConfirm('Create Market', '0', 'USDC', () => {
      writeContract({ address: PREDICTION_ADDRESS, abi: PREDICTION_ABI, functionName: 'createMarket', args: [newQuestion, newOptions[0] || '', newOptions[1] || '', newOptions[2] || '', newOptions[3] || '', newOptionCount, BigInt(newDuration)] })
      setMarkets(prev => [{ id: prev.length, question: newQuestion, options: newOptions.slice(0, newOptionCount), optionCount: newOptionCount, endTime: Date.now() / 1000 + Number(newDuration) * 3600, resolved: false, winningOption: 0, totalPool: 0, pools: new Array(newOptionCount).fill(0), creator: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x???' }, ...prev])
    })
    setNewQuestion(''); setNewOptions(['Yes', 'No', '', '']); setNewOptionCount(2); setNewDuration('24'); setPredictTab('markets')
  }

  const handlePlaceBet = (market: LocalMarket) => {
    if (!betAmount || Number(betAmount) <= 0) { showToast('❌ Enter bet amount!', 'error'); return }
    const amount = parseUnits(betAmount, 18)
    showTxConfirm('Place Bet', betAmount, 'USDC', () => {
      writeContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve', args: [PREDICTION_ADDRESS, amount] })
      setTimeout(() => writeContract({ address: PREDICTION_ADDRESS, abi: PREDICTION_ABI, functionName: 'placeBet', args: [BigInt(market.id), BigInt(betOption), amount] }), 5000)
      setMarkets(prev => prev.map(m => { if (m.id !== market.id) return m; const p = [...m.pools]; p[betOption] = (p[betOption] || 0) + Number(betAmount); return { ...m, totalPool: m.totalPool + Number(betAmount), pools: p } }))
    })
    setBetAmount(''); setSelectedMarket(null)
  }

  const handleResolveMarket = (market: LocalMarket) => {
    showTxConfirm('Resolve Market', '0', 'USDC', () => {
      writeContract({ address: PREDICTION_ADDRESS, abi: PREDICTION_ABI, functionName: 'resolveMarket', args: [BigInt(market.id), BigInt(resolveOption)] })
      setMarkets(prev => prev.map(m => m.id === market.id ? { ...m, resolved: true, winningOption: resolveOption } : m))
    })
    setSelectedMarket(null)
  }

  const handleClaimWinnings = (market: LocalMarket) => {
    showTxConfirm('Claim Winnings', '0', 'USDC', () => { writeContract({ address: PREDICTION_ADDRESS, abi: PREDICTION_ABI, functionName: 'claimWinnings', args: [BigInt(market.id)] }) })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setMintImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleMintNFT = () => {
    if (!mintName || !mintPrice) { showToast('❌ Fill name and price!', 'error'); return }
    const imageToUse = mintImagePreview || mintImageUrl || ['🎨', '🌟', '💎', '🔮', '⚡', '🌊'][Math.floor(Math.random() * 6)]
    const newNFT: NFT = { id: nfts.length + 1, name: mintName, image: imageToUse, imageType: mintImagePreview ? 'upload' : mintImageUrl ? 'url' : 'emoji', price: mintPrice, owner: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x???', listed: true, description: mintDesc || 'My custom NFT on Arc Testnet' }
    showTxConfirm('Mint NFT', mintPrice, mintName, () => setNfts(prev => [newNFT, ...prev]))
    setMintName(''); setMintDesc(''); setMintPrice(''); setMintImageUrl(''); setMintImagePreview('')
  }

  const handleBuyNFT = (nft: NFT) => {
    showTxConfirm('Buy NFT', nft.price, nft.name, () => setNfts(prev => prev.map(n => n.id === nft.id ? { ...n, owner: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : n.owner } : n)))
    setSelectedNft(null)
  }

  const renderNFTImage = (nft: NFT, height = 120) => {
    if (nft.imageType === 'emoji') return <div style={{ fontSize: `${height * 0.38}px`, textAlign: 'center', background: '#0a0a14', borderRadius: '12px', marginBottom: '1rem', height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{nft.image}</div>
    return <img src={nft.image} alt={nft.name} style={{ width: '100%', height: `${height}px`, objectFit: 'cover', borderRadius: '12px', marginBottom: '1rem' }} />
  }

  const timeLeft = (endTime: number) => { const d = endTime - Date.now() / 1000; if (d <= 0) return 'Ended'; const days = Math.floor(d / 86400); const hrs = Math.floor((d % 86400) / 3600); return days > 0 ? `${days}d ${hrs}h` : `${hrs}h left` }
  const getOdds = (pool: number, total: number) => total === 0 || pool === 0 ? '0%' : `${((pool / total) * 100).toFixed(1)}%`

  const navItems: { id: ActivePage; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'swap', label: 'Swap' },
    { id: 'lend', label: 'Lend' },
    { id: 'borrow', label: 'Borrow' },
    { id: 'nft', label: 'NFT' },
    { id: 'predict', label: 'Predict' },
    { id: 'history', label: 'History' },
    { id: 'dashboard', label: 'Dashboard' },
  ]

  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem', backdropFilter: 'blur(10px)' } as React.CSSProperties
  const inp = { width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' as const }
  const pill = (active: boolean, color = '#6366f1') => ({ padding: '0.45rem 1rem', borderRadius: '12px', border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', fontWeight: active ? '600' : '400', fontSize: '0.85rem', background: active ? color + '22' : 'transparent', color: active ? color : '#888', transition: 'all 0.15s' } as React.CSSProperties)
  const btnGrad = (from: string, to: string) => ({ width: '100%', padding: '1rem', background: `linear-gradient(135deg, ${from}, ${to})`, color: 'white', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' } as React.CSSProperties)

  const meshBg = {
    minHeight: '100vh',
    background: '#07070f',
    backgroundImage: `
      radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 10%, rgba(16,185,129,0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.1) 0%, transparent 50%),
      radial-gradient(ellipse at 90% 70%, rgba(236,72,153,0.06) 0%, transparent 40%)
    `,
    fontFamily: "'Inter', sans-serif",
    color: 'white',
  } as React.CSSProperties

  return (
    <div style={meshBg}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes glow { 0%,100% { opacity:0.5 } 50% { opacity:1 } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin-slow { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .marquee-track { display:flex; gap:3rem; animation: marquee 20s linear infinite; white-space:nowrap; }
        .float { animation: float 4s ease-in-out infinite; }
        .float2 { animation: float 5s ease-in-out infinite 1s; }
        .float3 { animation: float 6s ease-in-out infinite 2s; }
        .fadeUp { animation: fadeUp 0.6s ease forwards; }
        .card-hover { transition: all 0.25s; }
        .card-hover:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.4) !important; }
        .nav-link { transition: color 0.15s; }
        .nav-link:hover { color: #a5b4fc !important; }
        .service-card { transition: all 0.3s; }
        .service-card:hover { border-color: rgba(99,102,241,0.5) !important; transform: translateY(-4px); }
        input::placeholder { color: #555 }
        select option { background: #0f0f1e; color: white; }
      `}</style>

      <nav style={{ position: 'sticky', top: 0, zIndex: 200, background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }} onClick={() => setActivePage('home')}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #6366f1, #10b981)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.1rem' }}>Z</div>
            <span style={{ fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Zenlend</span>
            <span style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600', border: '1px solid rgba(99,102,241,0.3)' }}>TESTNET</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setActivePage(item.id)} className="nav-link"
                style={{ padding: '0.45rem 0.85rem', background: activePage === item.id ? 'rgba(99,102,241,0.15)' : 'transparent', color: activePage === item.id ? '#a5b4fc' : '#888', border: activePage === item.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent', borderRadius: '10px', cursor: 'pointer', fontWeight: activePage === item.id ? '600' : '400', fontSize: '0.85rem' }}>
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
              style={{ padding: '0.45rem 0.85rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', color: '#10b981', fontWeight: '600', fontSize: '0.8rem', textDecoration: 'none' }}>
              🚰 Faucet
            </a>
            <ConnectButton />
          </div>
        </div>
      </nav>

      <div style={{ background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.15)', padding: '0.6rem 0', overflow: 'hidden' }}>
        <div className="marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} style={{ color: '#a5b4fc', fontWeight: '600', fontSize: '0.8rem', letterSpacing: '0.05em' }}>{item}</span>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {activePage === 'home' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', minHeight: '80vh', paddingTop: '4rem' }}>
              <div className="fadeUp">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', padding: '0.4rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#a5b4fc', fontWeight: '600' }}>
                  <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'glow 2s ease-in-out infinite' }}></span>
                  Arc Testnet — Chain ID: 5042002
                </div>
                <h1 style={{ fontSize: '3.8rem', fontWeight: '900', lineHeight: '1.05', marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>
                  The Future of<br />
                  <span style={{ background: 'linear-gradient(135deg, #6366f1, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Onchain Finance</span>
                </h1>
                <p style={{ color: '#888', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2.5rem', maxWidth: '480px' }}>
                  Lend, borrow, swap, trade NFTs and create prediction markets — all with real USDC transactions on Arc Testnet.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button onClick={() => setActivePage('swap')}
                    style={{ padding: '0.9rem 2rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>
                    Launch App →
                  </button>
                  <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                    style={{ padding: '0.9rem 2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: 'white', fontWeight: '600', fontSize: '1rem', textDecoration: 'none' }}>
                    Get Free USDC
                  </a>
                </div>
              </div>

              <div style={{ position: 'relative', height: '450px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
                <div className="float" style={{ position: 'relative', zIndex: 2, fontSize: '6rem', filter: 'drop-shadow(0 0 30px rgba(99,102,241,0.5))' }}>⬡</div>
                {[
                  { icon: '💵', x: '-120px', y: '-80px', cls: 'float2', size: '2.5rem' },
                  { icon: '⟠', x: '100px', y: '-100px', cls: 'float3', size: '2rem' },
                  { icon: '₿', x: '-100px', y: '80px', cls: 'float', size: '2rem' },
                  { icon: '🦄', x: '120px', y: '70px', cls: 'float2', size: '2rem' },
                  { icon: '🔗', x: '0px', y: '-140px', cls: 'float3', size: '1.8rem' },
                  { icon: '👻', x: '160px', y: '-20px', cls: 'float', size: '1.8rem' },
                ].map((t, i) => (
                  <div key={i} className={t.cls} style={{ position: 'absolute', fontSize: t.size, left: `calc(50% + ${t.x})`, top: `calc(50% + ${t.y})`, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.5rem', backdropFilter: 'blur(10px)' }}>
                    {t.icon}
                  </div>
                ))}
                <div style={{ position: 'absolute', width: '280px', height: '280px', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '50%', animation: 'spin-slow 20s linear infinite' }} />
                <div style={{ position: 'absolute', width: '350px', height: '350px', border: '1px dashed rgba(16,185,129,0.1)', borderRadius: '50%', animation: 'spin-slow 30s linear infinite reverse' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', margin: '4rem 0' }}>
              {[
                { num: '$2M+', label: 'Total Value Locked', color: '#6366f1' },
                { num: '4.5%', label: 'Annual Yield (APY)', color: '#10b981' },
                { num: '7', label: 'Tokens Supported', color: '#06b6d4' },
                { num: '100%', label: 'Onchain & Transparent', color: '#8b5cf6' },
              ].map(stat => (
                <div key={stat.label} className="card-hover" style={{ ...card, textAlign: 'center', padding: '2rem 1rem' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: stat.color, marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>{stat.num}</div>
                  <div style={{ color: '#666', fontSize: '0.85rem' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '4rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <div style={{ color: '#6366f1', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>What We Offer</div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.03em' }}>Everything DeFi in One Place</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                {[
                  { num: '01', icon: '🔄', title: 'Swap Tokens', desc: 'Instantly swap between 7 tokens — USDC, EURC, ETH, WBTC, LINK, UNI, AAVE — with transparent pricing and 0.3% fee.', color: '#6366f1', page: 'swap' as ActivePage },
                  { num: '02', icon: '💰', title: 'Lend & Earn', desc: 'Deposit USDC as collateral and earn 4.5% APY. Real blockchain transactions on Arc Testnet with live balance tracking.', color: '#10b981', page: 'lend' as ActivePage },
                  { num: '03', icon: '🏦', title: 'Borrow USDC', desc: 'Borrow up to 80% of your collateral value. Health factor monitored in real time to keep your position safe.', color: '#06b6d4', page: 'borrow' as ActivePage },
                  { num: '04', icon: '🖼️', title: 'NFT Marketplace', desc: 'Mint, list, buy and sell NFTs on Arc Testnet. Upload your own image or use a URL to create unique digital assets.', color: '#ec4899', page: 'nft' as ActivePage },
                  { num: '05', icon: '🎯', title: 'Prediction Markets', desc: 'Create markets on any topic — crypto, sports, anything. Bet USDC on outcomes and win from the pool.', color: '#f59e0b', page: 'predict' as ActivePage },
                  { num: '06', icon: '📜', title: 'Transaction History', desc: 'Full log of all your onchain activity — deposits, borrows, swaps, NFTs, bets — with timestamps and tx hashes.', color: '#8b5cf6', page: 'history' as ActivePage },
                ].map(s => (
                  <div key={s.num} className="service-card" onClick={() => setActivePage(s.page)}
                    style={{ ...card, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <span style={{ color: '#333', fontSize: '0.8rem', fontWeight: '700' }}>{s.num}</span>
                      <span style={{ fontSize: '1.75rem' }}>{s.icon}</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', color: s.color }}>{s.title}</h3>
                    <p style={{ color: '#666', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1rem' }}>{s.desc}</p>
                    <span style={{ color: s.color, fontSize: '0.85rem', fontWeight: '600' }}>Explore →</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '4rem', padding: '2rem 0', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ textAlign: 'center', color: '#444', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Powered By</div>
              <div style={{ overflow: 'hidden' }}>
                <div className="marquee-track" style={{ gap: '4rem' }}>
                  {['⬡ Arc Network', '🔵 Circle USDC', '🦊 MetaMask', '🌈 RainbowKit', '⚡ wagmi', '🔷 viem', '▲ Vercel', '🐙 GitHub', '⬡ Arc Network', '🔵 Circle USDC', '🦊 MetaMask', '🌈 RainbowKit'].map((p, i) => (
                    <span key={i} style={{ color: '#555', fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.1) 0%, transparent 70%)', borderRadius: '24px', border: '1px solid rgba(99,102,241,0.15)', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.03em' }}>Start Building Onchain</h2>
              <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1rem' }}>Get free testnet USDC and start using Zenlend in minutes</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button onClick={() => setActivePage('swap')}
                  style={{ padding: '0.9rem 2.5rem', background: 'linear-gradient(135deg, #6366f1, #10b981)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>
                  Launch App
                </button>
                <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                  style={{ padding: '0.9rem 2.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: 'white', fontWeight: '600', fontSize: '1rem', textDecoration: 'none' }}>
                  🚰 Get Free USDC
                </a>
              </div>
            </div>
          </div>
        )}

        {activePage === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Your Portfolio</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Deposited', value: `$${deposited.toFixed(2)}`, sub: '4.5% APY', color: '#6366f1', icon: '💰' },
                { label: 'Borrowed', value: `$${borrowed.toFixed(2)}`, sub: '8.2% APR', color: '#ec4899', icon: '🏦' },
                { label: 'Interest', value: `$${interest.toFixed(4)}`, sub: 'Earned', color: '#10b981', icon: '📈' },
                { label: 'Health', value: `${healthFactor.toFixed(0)}%`, sub: borrowed === 0 ? 'No debt' : healthFactor > 50 ? 'Safe ✅' : 'At Risk ⚠️', color: healthFactor > 50 ? '#10b981' : '#ef4444', icon: '❤️' },
              ].map(c => (
                <div key={c.label} className="card-hover" style={{ ...card, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '-5px', fontSize: '3.5rem', opacity: 0.06 }}>{c.icon}</div>
                  <div style={{ color: '#555', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{c.label}</div>
                  <div style={{ color: c.color, fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>{c.value}</div>
                  <div style={{ background: c.color + '22', color: c.color, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block' }}>{c.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ ...card, marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: '600' }}>Portfolio Health</span>
                <span style={{ color: healthFactor > 50 ? '#10b981' : '#ef4444', fontWeight: '700' }}>{healthFactor.toFixed(0)}%</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '99px', height: '10px' }}>
                <div style={{ background: `linear-gradient(90deg, ${healthFactor > 70 ? '#10b981' : '#f59e0b'}, ${healthFactor > 70 ? '#06b6d4' : '#ef4444'})`, width: `${Math.min(healthFactor, 100)}%`, height: '10px', borderRadius: '99px', transition: 'width 0.5s' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Quick Deposit', action: () => setActivePage('lend'), color: '#6366f1', icon: '💰' },
                { label: 'Browse NFTs', action: () => setActivePage('nft'), color: '#ec4899', icon: '🖼️' },
                { label: 'Predict & Win', action: () => setActivePage('predict'), color: '#f59e0b', icon: '🎯' },
                { label: 'Claim Faucet', action: () => window.open('https://faucet.circle.com', '_blank'), color: '#10b981', icon: '🚰' },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ ...card, border: `1px solid ${item.color}22`, cursor: 'pointer', textAlign: 'center', color: item.color, fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' } as React.CSSProperties}>
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: '700' }}>Recent Transactions</span>
                <button onClick={() => setActivePage('history')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>View all →</button>
              </div>
              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#444' }}>No transactions yet. Start by depositing USDC!</div>
              ) : transactions.slice(0, 5).map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {tx.type === 'Deposit' ? '💰' : tx.type === 'Borrow' ? '🏦' : tx.type.includes('NFT') ? '🖼️' : tx.type.includes('Bet') || tx.type.includes('Market') ? '🎯' : '🔄'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{tx.type}</div>
                      <div style={{ color: '#444', fontSize: '0.75rem', fontFamily: 'monospace' }}>{tx.hash}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: '#6366f1' }}>{tx.amount}</div>
                    <div style={{ color: '#444', fontSize: '0.75rem' }}>{tx.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activePage === 'swap' && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}>
            <div style={{ width: '480px' }}>
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem' }}>Swap</span>
                  <span style={{ color: '#555', fontSize: '0.8rem' }}>Arc Testnet</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '0.4rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.5rem' }}>You pay</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input type="number" placeholder="0" value={swapAmount} onChange={e => setSwapAmount(e.target.value)}
                      style={{ background: 'none', border: 'none', fontSize: '2rem', fontWeight: '500', color: 'white', outline: 'none', width: '55%' }} />
                    <select value={swapFrom} onChange={e => setSwapFrom(e.target.value)}
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.5rem 0.75rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                      {TOKENS.map(t => <option key={t} value={t}>{TOKEN_ICONS[t]} {t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-0.1rem 0', position: 'relative', zIndex: 1 }}>
                  <button onClick={() => { const tmp = swapFrom; setSwapFrom(swapTo); setSwapTo(tmp) }}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '3px solid #07070f', borderRadius: '10px', width: '38px', height: '38px', cursor: 'pointer', fontSize: '1rem', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⇅</button>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.5rem' }}>You receive</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '500', color: '#10b981' }}>{swapAmount ? (Number(swapAmount) * 0.992).toFixed(4) : '0'}</div>
                    <select value={swapTo} onChange={e => setSwapTo(e.target.value)}
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.5rem 0.75rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                      {TOKENS.filter(t => t !== swapFrom).map(t => <option key={t} value={t}>{TOKEN_ICONS[t]} {t}</option>)}
                    </select>
                  </div>
                </div>
                {swapAmount && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.85rem' }}>
                    {[['Rate', `1 ${swapFrom} = 0.992 ${swapTo}`], ['Price Impact', '< 0.01%'], ['Fee', '0.30%']].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: '#555', marginBottom: '0.3rem' }}>
                        <span>{k}</span><span style={{ color: '#aaa' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button style={btnGrad('#6366f1', '#8b5cf6')}
                  onClick={() => { if (!swapAmount || Number(swapAmount) <= 0) return; showTxConfirm('Swap', swapAmount, `${swapFrom} → ${swapTo}`); setSwapAmount('') }}>
                  Swap {swapFrom} → {swapTo}
                </button>
              </div>
            </div>
          </div>
        )}

        {activePage === 'lend' && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '2rem' }}>
            <div style={{ width: '520px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem' }}>Deposit USDC</span>
                  <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.3rem 0.75rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700', border: '1px solid rgba(16,185,129,0.3)' }}>4.50% APY</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.5rem' }}>Amount</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input type="number" placeholder="0.00" value={lendAmount} onChange={e => setLendAmount(e.target.value)}
                      style={{ background: 'none', border: 'none', fontSize: '2rem', fontWeight: '500', color: 'white', outline: 'none', width: '65%' }} />
                    <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.5rem 0.75rem', fontWeight: '700', fontSize: '0.9rem' }}>💵 USDC</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {['10', '50', '100', '500'].map(a => (
                    <button key={a} onClick={() => setLendAmount(a)} style={{ flex: 1, padding: '0.5rem', border: `1px solid ${lendAmount === a ? '#6366f1' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', background: lendAmount === a ? 'rgba(99,102,241,0.15)' : 'transparent', color: lendAmount === a ? '#a5b4fc' : '#555', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>${a}</button>
                  ))}
                </div>
                <button style={btnGrad('#10b981', '#06b6d4')} onClick={handleDeposit}>Deposit USDC → Arc Testnet</button>
              </div>
              <div style={card}>
                <div style={{ fontWeight: '700', marginBottom: '1rem' }}>Your Position</div>
                {[['Deposited', `$${deposited.toFixed(2)} USDC`, '#6366f1'], ['Interest Earned', `$${interest.toFixed(4)} USDC`, '#10b981']].map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#555' }}>{k}</span><span style={{ color: c, fontWeight: '700' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activePage === 'borrow' && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '2rem' }}>
            <div style={{ width: '520px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem' }}>Borrow USDC</span>
                  <span style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899', padding: '0.3rem 0.75rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700', border: '1px solid rgba(236,72,153,0.3)' }}>8.20% APR</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#555' }}>Available to borrow</span>
                  <span style={{ fontWeight: '700' }}>${(deposited * 0.8 - borrowed).toFixed(2)} USDC</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.5rem' }}>Amount</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input type="number" placeholder="0.00" value={borrowAmount} onChange={e => setBorrowAmount(e.target.value)}
                      style={{ background: 'none', border: 'none', fontSize: '2rem', fontWeight: '500', color: 'white', outline: 'none', width: '65%' }} />
                    <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.5rem 0.75rem', fontWeight: '700', fontSize: '0.9rem' }}>💵 USDC</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {['25%', '50%', '75%', 'MAX'].map(p => (
                    <button key={p} onClick={() => { const m = p === 'MAX' ? 0.8 : parseFloat(p) / 100 * 0.8; setBorrowAmount((deposited * m).toFixed(2)) }} style={{ flex: 1, padding: '0.5rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', background: 'transparent', color: '#888', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>{p}</button>
                  ))}
                </div>
                <button style={btnGrad('#ec4899', '#8b5cf6')} onClick={handleBorrow}>Borrow USDC</button>
              </div>
              <div style={card}>
                <div style={{ fontWeight: '700', marginBottom: '1rem' }}>Borrow Position</div>
                {[['Borrowed', `$${borrowed.toFixed(2)} USDC`, '#ec4899'], ['Health Factor', `${healthFactor.toFixed(0)}%`, healthFactor > 50 ? '#10b981' : '#ef4444'], ['APR', '8.20%', '#f59e0b']].map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#555' }}>{k}</span><span style={{ color: c, fontWeight: '700' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activePage === 'nft' && (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[{ id: 'gallery' as const, label: '🖼️ Gallery' }, { id: 'create' as const, label: '🎨 Create' }, { id: 'mynfts' as const, label: '👤 My NFTs' }].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={pill(activeTab === t.id, '#ec4899')}>{t.label}</button>
              ))}
            </div>

            {activeTab === 'gallery' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {nfts.filter(n => n.listed).map(nft => (
                  <div key={nft.id} onClick={() => setSelectedNft(nft)} className="card-hover"
                    style={{ ...card, cursor: 'pointer' }}>
                    {renderNFTImage(nft, 150)}
                    <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{nft.name}</div>
                    <div style={{ color: '#444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{nft.owner}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '800', color: '#ec4899', fontSize: '1rem' }}>{nft.price} USDC</span>
                      <button onClick={e => { e.stopPropagation(); handleBuyNFT(nft) }}
                        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}>Buy</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'create' && (
              <div style={{ maxWidth: '480px' }}>
                <div style={card}>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Mint NFT</div>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      {[{ id: 'upload' as const, label: '📁 Upload' }, { id: 'url' as const, label: '🔗 URL' }].map(t => (
                        <button key={t.id} onClick={() => { setMintImageMode(t.id); setMintImagePreview(''); setMintImageUrl('') }} style={pill(mintImageMode === t.id, '#ec4899')}>{t.label}</button>
                      ))}
                    </div>
                    {mintImageMode === 'upload' && (
                      <>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.03)' }}>
                          {mintImagePreview ? <img src={mintImagePreview} alt="Preview" style={{ maxHeight: '140px', borderRadius: '10px' }} /> : <div><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div><div style={{ color: '#444', fontSize: '0.85rem' }}>Click to upload</div></div>}
                        </div>
                      </>
                    )}
                    {mintImageMode === 'url' && (
                      <>
                        <input style={{ ...inp, marginBottom: '0.5rem' }} placeholder="https://..." value={mintImageUrl} onChange={e => setMintImageUrl(e.target.value)} />
                        {mintImageUrl && <img src={mintImageUrl} alt="Preview" style={{ maxHeight: '120px', borderRadius: '10px' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                      </>
                    )}
                  </div>
                  {[{ l: 'Name *', p: 'NFT name', v: mintName, s: setMintName }, { l: 'Description', p: 'Optional', v: mintDesc, s: setMintDesc }].map(f => (
                    <div key={f.l} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.4rem' }}>{f.l}</div>
                      <input style={inp} placeholder={f.p} value={f.v} onChange={e => f.s(e.target.value)} />
                    </div>
                  ))}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.4rem' }}>Price (USDC) *</div>
                    <input style={inp} type="number" placeholder="100" value={mintPrice} onChange={e => setMintPrice(e.target.value)} />
                  </div>
                  <button style={btnGrad('#ec4899', '#8b5cf6')} onClick={handleMintNFT}>Mint NFT</button>
                </div>
              </div>
            )}

            {activeTab === 'mynfts' && (
              nfts.filter(n => n.owner === (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '')).length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🖼️</div>
                  <div style={{ color: '#444', marginBottom: '1rem' }}>No NFTs yet</div>
                  <button onClick={() => setActiveTab('create')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.6rem 1.25rem', cursor: 'pointer', fontWeight: '600', color: '#888' }}>Mint your first</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  {nfts.filter(n => n.owner === `${address?.slice(0, 6)}...${address?.slice(-4)}`).map(nft => (
                    <div key={nft.id} style={card}>{renderNFTImage(nft, 120)}<div style={{ fontWeight: '700' }}>{nft.name}</div><div style={{ color: '#ec4899', fontWeight: '700' }}>{nft.price} USDC</div></div>
                  ))}
                </div>
              )
            )}

            {selectedNft && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedNft(null)}>
                <div style={{ ...card, maxWidth: '400px', width: '90%', border: '1px solid rgba(236,72,153,0.3)' }} onClick={e => e.stopPropagation()}>
                  {renderNFTImage(selectedNft, 180)}
                  <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{selectedNft.name}</div>
                  <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{selectedNft.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                    <span style={{ color: '#555' }}>Price</span><span style={{ fontWeight: '800', color: '#ec4899' }}>{selectedNft.price} USDC</span>
                  </div>
                  <button style={btnGrad('#ec4899', '#8b5cf6')} onClick={() => handleBuyNFT(selectedNft)}>Buy for {selectedNft.price} USDC</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activePage === 'predict' && (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[{ id: 'markets' as const, label: '🎯 Markets' }, { id: 'create' as const, label: '➕ Create' }, { id: 'mymarkets' as const, label: '👤 Mine' }].map(t => (
                <button key={t.id} onClick={() => setPredictTab(t.id)} style={pill(predictTab === t.id, '#f59e0b')}>{t.label}</button>
              ))}
            </div>

            {predictTab === 'markets' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {markets.map(market => (
                  <div key={market.id} onClick={() => { setSelectedMarket(market); setBetOption(0); setBetAmount('') }} className="card-hover"
                    style={{ ...card, cursor: 'pointer', border: `1px solid ${market.resolved ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ background: market.resolved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: market.resolved ? '#10b981' : '#f59e0b', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>{market.resolved ? '✅ Resolved' : '🔴 Live'}</div>
                      <div style={{ color: '#444', fontSize: '0.8rem' }}>{timeLeft(market.endTime)}</div>
                    </div>
                    <div style={{ fontWeight: '700', marginBottom: '1rem', lineHeight: 1.4 }}>{market.question}</div>
                    {market.options.map((opt, i) => (
                      <div key={i} style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.85rem' }}>
                          <span style={{ color: market.resolved && market.winningOption === i ? '#10b981' : '#aaa', fontWeight: market.resolved && market.winningOption === i ? '700' : '400' }}>{market.resolved && market.winningOption === i ? '🏆 ' : ''}{opt}</span>
                          <span style={{ color: '#f59e0b', fontWeight: '600' }}>{getOdds(market.pools[i] || 0, market.totalPool)}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '99px', height: '4px' }}>
                          <div style={{ background: market.resolved && market.winningOption === i ? '#10b981' : '#f59e0b', width: getOdds(market.pools[i] || 0, market.totalPool), height: '4px', borderRadius: '99px' }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                      <span style={{ color: '#444' }}>Pool</span>
                      <span style={{ fontWeight: '700' }}>{market.totalPool} USDC</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {predictTab === 'create' && (
              <div style={{ maxWidth: '480px' }}>
                <div style={card}>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '1.5rem' }}>Create Prediction Market</div>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.4rem' }}>Question *</div>
                    <input style={inp} placeholder="Will BTC hit $200k in 2026?" value={newQuestion} onChange={e => setNewQuestion(e.target.value)} />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem' }}>Options</div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {[2, 3, 4].map(n => <button key={n} onClick={() => setNewOptionCount(n)} style={{ ...pill(newOptionCount === n, '#f59e0b'), flex: 1 }}>{n}</button>)}
                    </div>
                    {Array.from({ length: newOptionCount }).map((_, i) => (
                      <input key={i} style={{ ...inp, marginBottom: '0.5rem' }} placeholder={i === 0 ? 'Yes' : i === 1 ? 'No' : `Option ${i + 1}`} value={newOptions[i]} onChange={e => { const o = [...newOptions]; o[i] = e.target.value; setNewOptions(o) }} />
                    ))}
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem' }}>Duration</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[{ v: '1', l: '1h' }, { v: '24', l: '1d' }, { v: '72', l: '3d' }, { v: '168', l: '7d' }].map(h => (
                        <button key={h.v} onClick={() => setNewDuration(h.v)} style={{ ...pill(newDuration === h.v, '#f59e0b'), flex: 1 }}>{h.l}</button>
                      ))}
                    </div>
                  </div>
                  <button style={btnGrad('#f59e0b', '#f97316')} onClick={handleCreateMarket}>Create Market on Arc Testnet</button>
                </div>
              </div>
            )}

            {predictTab === 'mymarkets' && (
              markets.filter(m => m.creator === (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '')).length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎯</div>
                  <div style={{ color: '#444', marginBottom: '1rem' }}>No markets created yet</div>
                  <button onClick={() => setPredictTab('create')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.6rem 1.25rem', cursor: 'pointer', fontWeight: '600', color: '#888' }}>Create one</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  {markets.filter(m => m.creator === `${address?.slice(0, 6)}...${address?.slice(-4)}`).map(market => (
                    <div key={market.id} style={{ ...card, border: '1px solid rgba(245,158,11,0.2)' }}>
                      <div style={{ fontWeight: '700', marginBottom: '0.75rem' }}>{market.question}</div>
                      {!market.resolved && (
                        <div>
                          <select value={resolveOption} onChange={e => setResolveOption(Number(e.target.value))} style={{ ...inp, marginBottom: '0.75rem' }}>
                            {market.options.map((opt, i) => <option key={i} value={i}>{opt}</option>)}
                          </select>
                          <button onClick={() => handleResolveMarket(market)} style={btnGrad('#10b981', '#06b6d4')}>✅ Resolve</button>
                        </div>
                      )}
                      {market.resolved && <button onClick={() => handleClaimWinnings(market)} style={btnGrad('#f59e0b', '#f97316')}>🏆 Claim Winnings</button>}
                    </div>
                  ))}
                </div>
              )
            )}

            {selectedMarket && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedMarket(null)}>
                <div style={{ ...card, maxWidth: '440px', width: '90%', border: '1px solid rgba(245,158,11,0.3)' }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.75rem' }}>Place Bet</div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', lineHeight: 1.4, fontSize: '0.95rem', fontWeight: '600' }}>{selectedMarket.question}</div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    {selectedMarket.options.map((opt, i) => (
                      <button key={i} onClick={() => setBetOption(i)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0.75rem 1rem', border: `1px solid ${betOption === i ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', background: betOption === i ? 'rgba(245,158,11,0.1)' : 'transparent', cursor: 'pointer', marginBottom: '0.4rem', fontWeight: betOption === i ? '700' : '400', textAlign: 'left', color: betOption === i ? '#f59e0b' : '#aaa' }}>
                        <span>{betOption === i ? '✓ ' : ''}{opt}</span>
                        <span style={{ color: '#555', fontSize: '0.85rem' }}>{getOdds(selectedMarket.pools[i] || 0, selectedMarket.totalPool)}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      {['1', '5', '10', '50'].map(a => <button key={a} onClick={() => setBetAmount(a)} style={{ ...pill(betAmount === a, '#f59e0b'), flex: 1 }}>${a}</button>)}
                    </div>
                    <input style={inp} type="number" placeholder="0.00" value={betAmount} onChange={e => setBetAmount(e.target.value)} />
                  </div>
                  {betAmount && (
                    <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <span style={{ color: '#555' }}>Potential win</span>
                      <span style={{ color: '#10b981', fontWeight: '700' }}>~{selectedMarket.pools[betOption] > 0 ? ((Number(betAmount) / (selectedMarket.pools[betOption] + Number(betAmount))) * (selectedMarket.totalPool + Number(betAmount))).toFixed(2) : Number(betAmount).toFixed(2)} USDC</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setSelectedMarket(null)} style={{ flex: 1, padding: '0.9rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', cursor: 'pointer', fontWeight: '600', color: '#555' }}>Cancel</button>
                    <button onClick={() => handlePlaceBet(selectedMarket)} style={{ ...btnGrad('#f59e0b', '#f97316'), flex: 1 }}>Place Bet 🎯</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activePage === 'history' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>Transaction History</div>
              <div style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>{transactions.length} txns</div>
            </div>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📭</div>
                No transactions yet
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Type', 'Amount', 'Asset', 'Hash', 'Date', 'Time', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.8rem', color: '#444', fontWeight: '600' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.9rem 0.5rem', fontWeight: '600' }}>{tx.type === 'Deposit' ? '💰' : tx.type === 'Borrow' ? '🏦' : tx.type.includes('NFT') ? '🖼️' : tx.type.includes('Bet') || tx.type.includes('Market') ? '🎯' : '🔄'} {tx.type}</td>
                      <td style={{ padding: '0.9rem 0.5rem', color: '#6366f1', fontWeight: '700' }}>{tx.amount}</td>
                      <td style={{ padding: '0.9rem 0.5rem', color: '#555', fontSize: '0.85rem' }}>{tx.token}</td>
                      <td style={{ padding: '0.9rem 0.5rem', color: '#444', fontSize: '0.75rem', fontFamily: 'monospace' }}>{tx.hash}</td>
                      <td style={{ padding: '0.9rem 0.5rem', color: '#444', fontSize: '0.85rem' }}>{tx.date}</td>
                      <td style={{ padding: '0.9rem 0.5rem', color: '#444', fontSize: '0.85rem' }}>{tx.time}</td>
                      <td style={{ padding: '0.9rem 0.5rem' }}><span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>{tx.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '3rem 2rem 2rem', marginTop: '4rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366f1, #10b981)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>Z</div>
                <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>Zenlend</span>
              </div>
              <p style={{ color: '#444', fontSize: '0.85rem', lineHeight: '1.7', maxWidth: '300px' }}>The next generation DeFi + NFT + Prediction Market platform built on Arc Testnet with real onchain transactions.</p>
            </div>
            {[
              { title: 'App', links: [{ l: 'Swap', p: 'swap' as ActivePage }, { l: 'Lend', p: 'lend' as ActivePage }, { l: 'Borrow', p: 'borrow' as ActivePage }, { l: 'NFT Market', p: 'nft' as ActivePage }] },
              { title: 'More', links: [{ l: 'Predict', p: 'predict' as ActivePage }, { l: 'History', p: 'history' as ActivePage }, { l: 'Dashboard', p: 'dashboard' as ActivePage }] },
              { title: 'Links', links: [] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#888', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{col.title}</div>
                {col.links.map(link => (
                  <button key={link.l} onClick={() => setActivePage(link.p)} style={{ display: 'block', background: 'none', border: 'none', color: '#555', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '0.5rem', padding: 0, textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#a5b4fc')} onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
                    {link.l}
                  </button>
                ))}
                {col.title === 'Links' && (
                  <>
                    <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#555', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '0.5rem' }}>🚰 Faucet</a>
                    <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#555', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '0.5rem' }}>🔍 Explorer</a>
                    <a href="https://github.com/aadill54/arc-lending-app" target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#555', fontSize: '0.85rem', textDecoration: 'none' }}>🐙 GitHub</a>
                  </>
                )}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#333', fontSize: '0.8rem' }}>© 2026 Zenlend. Built on Arc Testnet · Chain ID: 5042002</span>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid rgba(16,185,129,0.2)' }}>🟢 Arc Testnet Live</span>
            </div>
          </div>
        </div>
      </footer>

      {showTxPopup && pendingTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ ...card, maxWidth: '360px', width: '90%', textAlign: 'center', border: '1px solid rgba(99,102,241,0.3)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
              {pendingTx.type === 'Deposit' ? '💰' : pendingTx.type === 'Borrow' ? '🏦' : pendingTx.type.includes('NFT') ? '🖼️' : pendingTx.type.includes('Bet') || pendingTx.type.includes('Market') ? '🎯' : '🔄'}
            </div>
            <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Confirm Transaction</div>
            <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Review details below</div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[['Type', pendingTx.type], ['Amount', pendingTx.amount || '—'], ['Asset', pendingTx.token], ['Network', 'Arc Testnet']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span style={{ color: '#555' }}>{k}</span>
                  <span style={{ fontWeight: '600' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setShowTxPopup(false); setPendingTx(null) }} style={{ flex: 1, padding: '0.9rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', cursor: 'pointer', fontWeight: '600', color: '#555' }}>Cancel</button>
              <button onClick={confirmTx} style={{ ...btnGrad('#6366f1', '#8b5cf6'), flex: 1, borderRadius: '14px' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: toastType === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toastType === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`, color: toastType === 'success' ? '#10b981' : '#ef4444', padding: '0.9rem 1.25rem', borderRadius: '14px', fontWeight: '600', zIndex: 9999, backdropFilter: 'blur(10px)', fontSize: '0.9rem' }}>
          {toast}
        </div>
      )}
    </div>
  )
}