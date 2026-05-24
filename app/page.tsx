'use client'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
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
const TOKEN_ICONS: Record<string, string> = { USDC: '💵', EURC: '💶', ETH: '⟠', WBTC: '₿', LINK: '🔗', UNI: '🦄', AAVE: '👻' }

type ActivePage = 'dashboard' | 'lend' | 'borrow' | 'swap' | 'nft' | 'history' | 'predict'
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

export default function Home() {
  const { isConnected, address } = useAccount()
  const [activePage, setActivePage] = useState<ActivePage>('swap')
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

  // Separate write hooks so we can track each tx hash independently
  const { writeContract: approveForDeposit, data: approveDepositHash } = useWriteContract()
  const { writeContract: executeDeposit } = useWriteContract()
  const { writeContract: executeBorrow } = useWriteContract()
  const { writeContract: approveForBet, data: approveBetHash } = useWriteContract()
  const { writeContract: executeBet } = useWriteContract()
  const { writeContract } = useWriteContract()

  // Track pending amounts so we can fire step 2 after approve confirms
  const [pendingDepositAmt, setPendingDepositAmt] = useState<bigint | null>(null)
  const [pendingBetData, setPendingBetData] = useState<{marketId: bigint; option: bigint; amount: bigint} | null>(null)

  // Wait for approve receipts
  const { isSuccess: depositApproveOk } = useWaitForTransactionReceipt({ hash: approveDepositHash })
  const { isSuccess: betApproveOk } = useWaitForTransactionReceipt({ hash: approveBetHash })

  // Step 2: fire deposit after approve confirms
  useEffect(() => {
    if (depositApproveOk && pendingDepositAmt !== null) {
      executeDeposit({ address: CONTRACT_ADDRESS, abi: LENDING_ABI, functionName: 'deposit', args: [pendingDepositAmt] })
      setPendingDepositAmt(null)
    }
  }, [depositApproveOk])

  // Step 2: fire placeBet after approve confirms
  useEffect(() => {
    if (betApproveOk && pendingBetData !== null) {
      executeBet({ address: PREDICTION_ADDRESS, abi: PREDICTION_ABI, functionName: 'placeBet', args: [pendingBetData.marketId, pendingBetData.option, pendingBetData.amount] })
      setPendingBetData(null)
    }
  }, [betApproveOk])

  // FIX: properly handle loading states for on-chain data
  const { data: depositedRaw, isLoading: depositLoading } = useReadContract({
    address: CONTRACT_ADDRESS, abi: LENDING_ABI, functionName: 'getDeposit',
    args: [address!], query: { enabled: !!address }
  })
  const { data: borrowedRaw, isLoading: borrowLoading } = useReadContract({
    address: CONTRACT_ADDRESS, abi: LENDING_ABI, functionName: 'getBorrow',
    args: [address!], query: { enabled: !!address }
  })

  const isLoadingChainData = depositLoading || borrowLoading
  const deposited = depositedRaw ? Number(formatUnits(depositedRaw, 18)) : 0
  const borrowed = borrowedRaw ? Number(formatUnits(borrowedRaw, 18)) : 0
  // FIX: interest is annual projected, not "earned" — label clarified
  const interestAnnual = deposited * 0.045
  // FIX: healthFactor is a proper ratio clamped 0–100
  const healthFactor = borrowed === 0 ? 100 : Math.min(100, Math.max(0, ((deposited * 0.8 - borrowed) / (deposited * 0.8)) * 100))
  // Available to borrow = 80% of deposited minus what's already borrowed
  const availableToBorrow = Math.max(0, deposited * 0.8 - borrowed)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3500)
  }

  const addTx = (type: string, amount: string, token: string) => {
    const hash = '0x' + Math.random().toString(16).slice(2, 12) + '...' + Math.random().toString(16).slice(2, 6)
    setTransactions(prev => [{ id: Date.now(), type, amount, token, time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString(), status: 'Success', hash }, ...prev])
  }

  const showTxConfirm = (type: string, amount: string, token: string, onConfirm?: () => void) => {
    setPendingTx({ type, amount, token, onConfirm }); setShowTxPopup(true)
  }

  const confirmTx = () => {
    if (!pendingTx) return
    if (pendingTx.onConfirm) pendingTx.onConfirm()
    addTx(pendingTx.type, pendingTx.amount, pendingTx.token)
    showToast(`✅ ${pendingTx.type} confirmed!`)
    setShowTxPopup(false); setPendingTx(null)
  }

  const handleDeposit = () => {
    if (!lendAmount || Number(lendAmount) <= 0) { showToast('❌ Enter a valid amount', 'error'); return }
    const amount = parseUnits(lendAmount, 18)
    showTxConfirm('Deposit', lendAmount, 'USDC', () => {
      // Step 1: approve — MetaMask will show the exact USDC amount
      setPendingDepositAmt(amount)
      approveForDeposit({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve', args: [CONTRACT_ADDRESS, amount] })
      // Step 2: deposit fires automatically via useEffect when approve confirms
    })
    setLendAmount('')
  }

  const handleBorrow = () => {
    if (!borrowAmount || Number(borrowAmount) <= 0) { showToast('❌ Enter a valid amount', 'error'); return }
    // FIX: client-side guard against over-borrowing
    if (Number(borrowAmount) > availableToBorrow) {
      showToast(`❌ Exceeds borrow limit of ${availableToBorrow.toFixed(2)} USDC`, 'error'); return
    }
    const amount = parseUnits(borrowAmount, 18)
    showTxConfirm('Borrow', borrowAmount, 'USDC', () => {
      writeContract({ address: CONTRACT_ADDRESS, abi: LENDING_ABI, functionName: 'borrow', args: [amount] })
    })
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
    if (!betAmount || Number(betAmount) <= 0) { showToast('❌ Enter a bet amount!', 'error'); return }
    const amount = parseUnits(betAmount, 18)
    showTxConfirm('Place Bet', betAmount, 'USDC', () => {
      // Step 1: approve — MetaMask will show exact USDC amount
      setPendingBetData({ marketId: BigInt(market.id), option: BigInt(betOption), amount })
      approveForBet({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve', args: [PREDICTION_ADDRESS, amount] })
      // Step 2: placeBet fires automatically via useEffect when approve confirms
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
    showTxConfirm('Claim Winnings', '0', 'USDC', () => {
      writeContract({ address: PREDICTION_ADDRESS, abi: PREDICTION_ABI, functionName: 'claimWinnings', args: [BigInt(market.id)] })
    })
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
    if (nft.imageType === 'emoji') return <div style={{ fontSize: `${height * 0.38}px`, textAlign: 'center', background: '#f9f9fb', borderRadius: '16px', marginBottom: '1rem', height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{nft.image}</div>
    return <img src={nft.image} alt={nft.name} style={{ width: '100%', height: `${height}px`, objectFit: 'cover', borderRadius: '16px', marginBottom: '1rem' }} />
  }

  const timeLeft = (endTime: number) => { const d = endTime - Date.now() / 1000; if (d <= 0) return 'Ended'; const days = Math.floor(d / 86400); const hrs = Math.floor((d % 86400) / 3600); return days > 0 ? `${days}d ${hrs}h` : `${hrs}h left` }
  // FIX: getOdds now returns a numeric percentage string suitable for bar widths
  const getOdds = (pool: number, total: number) => total === 0 || pool === 0 ? '0%' : `${((pool / total) * 100).toFixed(1)}%`
  // Separate helper for bar width (numeric, clamped 0–100)
  const getOddsNum = (pool: number, total: number) => total === 0 || pool === 0 ? 0 : Math.min(100, (pool / total) * 100)

  const navItems: { id: ActivePage; label: string }[] = [
    { id: 'swap', label: 'Swap' },
    { id: 'lend', label: 'Lend' },
    { id: 'borrow', label: 'Borrow' },
    { id: 'nft', label: 'NFT' },
    { id: 'predict', label: 'Predict' },
    { id: 'history', label: 'History' },
    { id: 'dashboard', label: 'Dashboard' },
  ]

  // Styles
  const card = { background: 'white', borderRadius: '20px', padding: '1.5rem', border: '1px solid #f0eff5', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as React.CSSProperties
  const input = { width: '100%', padding: '0.85rem 1rem', background: '#f9f9fb', border: '1px solid #f0eff5', borderRadius: '12px', color: '#1c1b20', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' as const }
  const pill = (active: boolean) => ({ padding: '0.5rem 1rem', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: active ? '600' : '500', fontSize: '0.9rem', background: active ? '#f0eff5' : 'transparent', color: active ? '#1c1b20' : '#7d7d8a', transition: 'all 0.15s' } as React.CSSProperties)
  const btnPink = { width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #ff007a, #ff6b9d)', color: 'white', border: 'none', borderRadius: '20px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' } as React.CSSProperties
  const btnBlue = { width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: 'white', border: 'none', borderRadius: '20px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' } as React.CSSProperties
  const btnGreen = { width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: '20px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' } as React.CSSProperties
  const badge = (color: string) => ({ background: color + '18', color, padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-block' } as React.CSSProperties)

  // Health factor color
  const healthColor = healthFactor >= 60 ? '#059669' : healthFactor >= 30 ? '#d97706' : '#ef4444'
  const healthLabel = borrowed === 0 ? 'No debt' : healthFactor >= 60 ? 'Safe' : healthFactor >= 30 ? 'Caution' : 'At Risk'

  return (
    <div style={{ minHeight: '100vh', background: '#faf9fb', fontFamily: "'Inter', sans-serif" }}>

      {/* NAVBAR */}
      <nav style={{ background: 'rgba(250,249,251,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #f0eff5', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #ff007a, #2563eb)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1rem' }}>A</div>
            <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#1c1b20' }}>ArcFi</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', background: 'white', borderRadius: '18px', padding: '0.3rem', border: '1px solid #f0eff5' }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setActivePage(item.id)} style={pill(activePage === item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
              style={{ padding: '0.5rem 0.9rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', color: '#059669', fontWeight: '600', fontSize: '0.8rem', textDecoration: 'none' }}>
              🚰 Faucet
            </a>
            <div style={{ padding: '0.5rem 0.9rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', color: '#0284c7', fontWeight: '600', fontSize: '0.8rem' }}>
              🟢 Arc Testnet
            </div>
            <ConnectButton />
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {!isConnected ? (
          <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #f0eff5', borderRadius: '20px', padding: '0.4rem 1rem', marginBottom: '2rem', fontSize: '0.85rem', color: '#7d7d8a' }}>
              <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
              Arc Testnet Live
            </div>
            <h1 style={{ fontSize: '3.5rem', fontWeight: '900', color: '#1c1b20', marginBottom: '1rem', lineHeight: 1.1 }}>
              The DeFi Hub for<br />
              <span style={{ background: 'linear-gradient(135deg, #ff007a, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Arc Network</span>
            </h1>
            <p style={{ color: '#7d7d8a', fontSize: '1.1rem', marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem' }}>
              Swap tokens, lend & borrow USDC, trade NFTs, and predict the future — all onchain on Arc Testnet.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '4rem', flexWrap: 'wrap' }}>
              <button onClick={() => setActivePage('swap')} style={{ ...btnPink, width: 'auto', padding: '0.9rem 2rem', fontSize: '1rem' }}>Launch App →</button>
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                style={{ padding: '0.9rem 2rem', background: 'white', border: '1px solid #f0eff5', borderRadius: '20px', color: '#1c1b20', fontWeight: '600', fontSize: '1rem', textDecoration: 'none' }}>
                Get Free USDC
              </a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', maxWidth: '700px', margin: '0 auto' }}>
              {[
                { icon: '🔄', title: 'Swap', desc: '7 tokens, instant execution', color: '#ff007a' },
                { icon: '💰', title: 'Lend & Borrow', desc: 'Earn 4.5% APY on USDC', color: '#2563eb' },
                { icon: '🎯', title: 'Predict', desc: 'Create & bet on any outcome', color: '#059669' },
              ].map(f => (
                <div key={f.title} style={{ ...card, textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                  <div style={{ fontWeight: '700', color: f.color, marginBottom: '0.25rem' }}>{f.title}</div>
                  <div style={{ color: '#7d7d8a', fontSize: '0.85rem' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ─── SWAP ─── */}
            {activePage === 'swap' && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '2rem' }}>
                <div style={{ width: '480px' }}>
                  <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: '#1c1b20' }}>Swap</span>
                      <span style={{ fontSize: '0.8rem', color: '#7d7d8a' }}>Arc Testnet</span>
                    </div>
                    <div style={{ background: '#f9f9fb', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#7d7d8a', marginBottom: '0.5rem' }}>You pay</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <input type="number" placeholder="0" value={swapAmount} onChange={e => setSwapAmount(e.target.value)}
                          style={{ background: 'none', border: 'none', fontSize: '2.2rem', fontWeight: '500', color: '#1c1b20', outline: 'none', width: '55%' }} />
                        <select value={swapFrom} onChange={e => setSwapFrom(e.target.value)}
                          style={{ background: 'white', color: '#1c1b20', border: '1px solid #f0eff5', borderRadius: '12px', padding: '0.5rem 0.75rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                          {TOKENS.map(t => <option key={t} value={t}>{TOKEN_ICONS[t]} {t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '-0.1rem 0', position: 'relative', zIndex: 1 }}>
                      <button onClick={() => { const tmp = swapFrom; setSwapFrom(swapTo); setSwapTo(tmp) }}
                        style={{ background: 'white', border: '4px solid #faf9fb', borderRadius: '12px', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1rem', color: '#7d7d8a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>⇅</button>
                    </div>
                    <div style={{ background: '#f9f9fb', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#7d7d8a', marginBottom: '0.5rem' }}>You receive</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '2.2rem', fontWeight: '500', color: '#1c1b20' }}>{swapAmount ? (Number(swapAmount) * 0.992).toFixed(4) : '0'}</div>
                        <select value={swapTo} onChange={e => setSwapTo(e.target.value)}
                          style={{ background: 'white', color: '#1c1b20', border: '1px solid #f0eff5', borderRadius: '12px', padding: '0.5rem 0.75rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                          {TOKENS.filter(t => t !== swapFrom).map(t => <option key={t} value={t}>{TOKEN_ICONS[t]} {t}</option>)}
                        </select>
                      </div>
                    </div>
                    {swapAmount && (
                      <div style={{ background: '#f9f9fb', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                        {[['Rate', `1 ${swapFrom} = 0.992 ${swapTo}`], ['Price Impact', '< 0.01%'], ['Fee', '0.30%']].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: '#7d7d8a', marginBottom: '0.3rem' }}>
                            <span>{k}</span><span style={{ color: '#1c1b20', fontWeight: '500' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button style={btnPink} onClick={() => { if (!swapAmount || Number(swapAmount) <= 0) return; showTxConfirm('Swap', swapAmount, `${swapFrom} → ${swapTo}`); setSwapAmount('') }}>
                      Swap {swapFrom} → {swapTo}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── DASHBOARD (IMPROVED) ─── */}
            {activePage === 'dashboard' && (
              <div>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontWeight: '800', fontSize: '1.5rem', color: '#1c1b20', marginBottom: '0.25rem' }}>Your Portfolio</h2>
                    <p style={{ color: '#7d7d8a', fontSize: '0.85rem' }}>
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''} · Arc Testnet
                    </p>
                  </div>
                  {/* FIX: show loading spinner while chain data loads */}
                  {isLoadingChainData && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7d7d8a', fontSize: '0.85rem', background: 'white', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #f0eff5' }}>
                      <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                      Loading onchain data...
                    </div>
                  )}
                </div>

                {/* FIX: spinner animation injected once */}
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    {
                      label: 'Total Deposited',
                      value: isLoadingChainData ? '—' : `$${deposited.toFixed(2)}`,
                      sub: '4.5% APY',
                      subColor: '#059669',
                      color: '#2563eb',
                      icon: '💰',
                      bg: '#eff6ff',
                    },
                    {
                      label: 'Total Borrowed',
                      value: isLoadingChainData ? '—' : `$${borrowed.toFixed(2)}`,
                      sub: '8.2% APR',
                      subColor: '#dc2626',
                      color: '#ff007a',
                      icon: '🏦',
                      bg: '#fff1f5',
                    },
                    {
                      label: 'Est. Annual Yield',
                      value: isLoadingChainData ? '—' : `$${interestAnnual.toFixed(4)}`,
                      // FIX: clarified label — this is projected annual, not already earned
                      sub: 'Projected / year',
                      subColor: '#059669',
                      color: '#059669',
                      icon: '📈',
                      bg: '#f0fdf4',
                    },
                    {
                      label: 'Health Factor',
                      value: isLoadingChainData ? '—' : `${healthFactor.toFixed(0)}%`,
                      sub: healthLabel,
                      subColor: healthColor,
                      color: healthColor,
                      icon: borrowed === 0 ? '✅' : healthFactor >= 60 ? '🟢' : healthFactor >= 30 ? '🟡' : '🔴',
                      bg: healthFactor >= 60 ? '#f0fdf4' : healthFactor >= 30 ? '#fffbeb' : '#fef2f2',
                    },
                  ].map(c => (
                    <div key={c.label} style={{ ...card, background: c.bg, border: `1px solid ${c.color}20` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#7d7d8a', fontSize: '0.8rem', fontWeight: '500' }}>{c.label}</span>
                        <span style={{ fontSize: '1.2rem' }}>{c.icon}</span>
                      </div>
                      <div style={{ color: c.color, fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', lineHeight: 1 }}>
                        {c.value}
                      </div>
                      <div style={badge(c.subColor)}>{c.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Two-column: Health bar + Quick actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

                  {/* Health factor breakdown */}
                  <div style={card}>
                    <div style={{ fontWeight: '700', marginBottom: '1.25rem', fontSize: '0.95rem' }}>Borrow Health</div>

                    {/* FIX: health bar width now uses numeric value, not string from getOdds */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ color: '#7d7d8a' }}>Health Factor</span>
                        <span style={{ fontWeight: '700', color: healthColor }}>{isLoadingChainData ? '—' : `${healthFactor.toFixed(0)}%`}</span>
                      </div>
                      <div style={{ background: '#f0eff5', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
                        <div style={{
                          background: `linear-gradient(90deg, ${healthColor}, ${healthFactor >= 60 ? '#10b981' : healthFactor >= 30 ? '#f59e0b' : '#ef4444'})`,
                          width: `${isLoadingChainData ? 0 : Math.min(100, Math.max(0, healthFactor))}%`,
                          height: '10px',
                          borderRadius: '99px',
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>

                    {/* LTV bar */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ color: '#7d7d8a' }}>LTV Used</span>
                        <span style={{ fontWeight: '700', color: '#1c1b20' }}>
                          {isLoadingChainData ? '—' : deposited === 0 ? '0%' : `${((borrowed / (deposited * 0.8)) * 100).toFixed(1)}%`}
                        </span>
                      </div>
                      <div style={{ background: '#f0eff5', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                        <div style={{
                          background: '#ff007a',
                          width: `${isLoadingChainData || deposited === 0 ? 0 : Math.min(100, (borrowed / (deposited * 0.8)) * 100)}%`,
                          height: '6px',
                          borderRadius: '99px',
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>

                    {/* Key numbers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {[
                        { l: 'Collateral', v: isLoadingChainData ? '—' : `$${deposited.toFixed(2)}`, c: '#2563eb' },
                        { l: 'Borrow Limit', v: isLoadingChainData ? '—' : `$${(deposited * 0.8).toFixed(2)}`, c: '#7d7d8a' },
                        { l: 'Available', v: isLoadingChainData ? '—' : `$${availableToBorrow.toFixed(2)}`, c: '#059669' },
                        { l: 'Debt', v: isLoadingChainData ? '—' : `$${borrowed.toFixed(2)}`, c: '#ff007a' },
                      ].map(r => (
                        <div key={r.l} style={{ background: '#f9f9fb', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                          <div style={{ color: '#7d7d8a', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{r.l}</div>
                          <div style={{ color: r.c, fontWeight: '700', fontSize: '0.95rem' }}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div style={card}>
                    <div style={{ fontWeight: '700', marginBottom: '1.25rem', fontSize: '0.95rem' }}>Quick Actions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {[
                        { label: '💰 Deposit USDC', desc: 'Earn 4.5% APY', page: 'lend' as ActivePage, style: btnBlue },
                        { label: '🏦 Borrow USDC', desc: `Up to $${availableToBorrow.toFixed(2)} available`, page: 'borrow' as ActivePage, style: btnPink },
                        { label: '🔄 Swap Tokens', desc: '7 tokens supported', page: 'swap' as ActivePage, style: btnGreen },
                        { label: '🎯 Predict Markets', desc: `${markets.filter(m => !m.resolved).length} active markets`, page: 'predict' as ActivePage, style: { ...btnBlue, background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' } },
                      ].map(a => (
                        <button key={a.label} onClick={() => setActivePage(a.page)}
                          style={{ ...a.style, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderRadius: '14px', textAlign: 'left' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{a.label}</span>
                          <span style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: '400' }}>{a.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent transactions */}
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Recent Transactions</span>
                      {transactions.length > 0 && <span style={{ ...badge('#2563eb'), marginLeft: '0.5rem' }}>{transactions.length}</span>}
                    </div>
                    <button onClick={() => setActivePage('history')} style={{ background: 'none', border: 'none', color: '#ff007a', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>View all →</button>
                  </div>
                  {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', color: '#7d7d8a' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>No transactions yet</div>
                      <div style={{ fontSize: '0.8rem', color: '#b0b0b8' }}>Deposit, borrow, or swap to get started</div>
                    </div>
                  ) : transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0', borderBottom: '1px solid #f9f9fb' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#f9f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                          {tx.type === 'Deposit' ? '💰' : tx.type === 'Borrow' ? '🏦' : tx.type.includes('NFT') ? '🖼️' : tx.type.includes('Bet') || tx.type.includes('Market') ? '🎯' : '🔄'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1c1b20' }}>{tx.type}</div>
                          {/* FIX: use monospace font stack that actually works */}
                          <div style={{ color: '#7d7d8a', fontSize: '0.75rem', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{tx.hash}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '700', color: '#2563eb', fontSize: '0.9rem' }}>{tx.amount} <span style={{ color: '#7d7d8a', fontWeight: '400', fontSize: '0.8rem' }}>{tx.token}</span></div>
                        <div style={{ color: '#7d7d8a', fontSize: '0.75rem' }}>{tx.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── LEND ─── */}
            {activePage === 'lend' && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '2rem' }}>
                <div style={{ width: '480px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem' }}>Deposit USDC</span>
                      <span style={{ background: '#f0fdf4', color: '#059669', padding: '0.3rem 0.75rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700' }}>4.50% APY</span>
                    </div>
                    <div style={{ background: '#f9f9fb', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#7d7d8a', marginBottom: '0.5rem' }}>Amount</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <input type="number" placeholder="0.00" value={lendAmount} onChange={e => setLendAmount(e.target.value)}
                          style={{ background: 'none', border: 'none', fontSize: '2rem', fontWeight: '500', color: '#1c1b20', outline: 'none', width: '65%' }} />
                        <div style={{ background: 'white', border: '1px solid #f0eff5', borderRadius: '12px', padding: '0.5rem 0.75rem', fontWeight: '700', fontSize: '0.9rem' }}>💵 USDC</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      {['10', '50', '100', '500'].map(a => (
                        <button key={a} onClick={() => setLendAmount(a)} style={{ flex: 1, padding: '0.5rem', border: `1px solid ${lendAmount === a ? '#2563eb' : '#f0eff5'}`, borderRadius: '10px', background: lendAmount === a ? '#eff6ff' : 'white', color: lendAmount === a ? '#2563eb' : '#7d7d8a', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>${a}</button>
                      ))}
                    </div>
                    <button style={btnBlue} onClick={handleDeposit}>Deposit USDC</button>
                  </div>
                  <div style={card}>
                    <div style={{ fontWeight: '700', marginBottom: '1rem' }}>Your Position</div>
                    {[['Deposited', `$${deposited.toFixed(2)} USDC`, '#2563eb'], ['Est. Annual Yield', `$${interestAnnual.toFixed(4)} USDC`, '#059669']].map(([k, v, c]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f9f9fb' }}>
                        <span style={{ color: '#7d7d8a' }}>{k}</span><span style={{ color: c, fontWeight: '700' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── BORROW ─── */}
            {activePage === 'borrow' && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '2rem' }}>
                <div style={{ width: '480px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem' }}>Borrow USDC</span>
                      <span style={{ background: '#fff1f2', color: '#ff007a', padding: '0.3rem 0.75rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700' }}>8.20% APR</span>
                    </div>
                    <div style={{ background: '#f9f9fb', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: '#7d7d8a' }}>Available to borrow</span>
                      <span style={{ fontWeight: '700', color: '#1c1b20' }}>${availableToBorrow.toFixed(2)} USDC</span>
                    </div>
                    <div style={{ background: '#f9f9fb', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#7d7d8a', marginBottom: '0.5rem' }}>Amount</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <input type="number" placeholder="0.00" value={borrowAmount} onChange={e => setBorrowAmount(e.target.value)}
                          style={{ background: 'none', border: 'none', fontSize: '2rem', fontWeight: '500', color: '#1c1b20', outline: 'none', width: '65%' }} />
                        <div style={{ background: 'white', border: '1px solid #f0eff5', borderRadius: '12px', padding: '0.5rem 0.75rem', fontWeight: '700', fontSize: '0.9rem' }}>💵 USDC</div>
                      </div>
                    </div>
                    {/* FIX: percentage buttons now correctly use availableToBorrow */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      {['25%', '50%', '75%', 'MAX'].map(p => (
                        <button key={p} onClick={() => {
                          const pct = p === 'MAX' ? 1 : parseFloat(p) / 100
                          setBorrowAmount((availableToBorrow * pct).toFixed(2))
                        }} style={{ flex: 1, padding: '0.5rem', border: '1px solid #f0eff5', borderRadius: '10px', background: 'white', color: '#7d7d8a', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>{p}</button>
                      ))}
                    </div>
                    <button style={btnPink} onClick={handleBorrow}>Borrow USDC</button>
                  </div>
                  <div style={card}>
                    <div style={{ fontWeight: '700', marginBottom: '1rem' }}>Borrow Position</div>
                    {[['Borrowed', `$${borrowed.toFixed(2)} USDC`, '#ff007a'], ['Health Factor', `${healthFactor.toFixed(0)}%`, healthColor]].map(([k, v, c]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f9f9fb' }}>
                        <span style={{ color: '#7d7d8a' }}>{k}</span><span style={{ color: c, fontWeight: '700' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── NFT ─── */}
            {activePage === 'nft' && (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {[{ id: 'gallery' as const, label: 'Gallery' }, { id: 'create' as const, label: 'Create' }, { id: 'mynfts' as const, label: 'My NFTs' }].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={pill(activeTab === t.id)}>{t.label}</button>
                  ))}
                </div>
                {activeTab === 'gallery' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    {nfts.filter(n => n.listed).map(nft => (
                      <div key={nft.id} onClick={() => setSelectedNft(nft)}
                        style={{ ...card, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}>
                        {renderNFTImage(nft, 140)}
                        <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>{nft.name}</div>
                        <div style={{ color: '#7d7d8a', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{nft.owner}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', color: '#ff007a', fontSize: '1rem' }}>{nft.price} USDC</span>
                          <button onClick={e => { e.stopPropagation(); handleBuyNFT(nft) }}
                            style={{ background: '#ff007a', color: 'white', border: 'none', borderRadius: '10px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}>Buy</button>
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
                            <button key={t.id} onClick={() => { setMintImageMode(t.id); setMintImagePreview(''); setMintImageUrl('') }} style={pill(mintImageMode === t.id)}>{t.label}</button>
                          ))}
                        </div>
                        {mintImageMode === 'upload' && (
                          <>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                            <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed #f0eff5', borderRadius: '16px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: '#f9f9fb' }}>
                              {mintImagePreview ? <img src={mintImagePreview} alt="Preview" style={{ maxHeight: '140px', borderRadius: '10px' }} /> : <div><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div><div style={{ color: '#7d7d8a', fontSize: '0.85rem' }}>Click to upload</div></div>}
                            </div>
                          </>
                        )}
                        {mintImageMode === 'url' && (
                          <>
                            <input style={{ ...input, marginBottom: '0.5rem' }} placeholder="https://..." value={mintImageUrl} onChange={e => setMintImageUrl(e.target.value)} />
                            {mintImageUrl && <img src={mintImageUrl} alt="Preview" style={{ maxHeight: '120px', borderRadius: '10px' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                          </>
                        )}
                      </div>
                      {[{ l: 'Name *', p: 'NFT name', v: mintName, s: setMintName }, { l: 'Description', p: 'Optional description', v: mintDesc, s: setMintDesc }].map(f => (
                        <div key={f.l} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.85rem', color: '#7d7d8a', marginBottom: '0.4rem' }}>{f.l}</div>
                          <input style={input} placeholder={f.p} value={f.v} onChange={e => f.s(e.target.value)} />
                        </div>
                      ))}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#7d7d8a', marginBottom: '0.4rem' }}>Price (USDC) *</div>
                        <input style={input} type="number" placeholder="100" value={mintPrice} onChange={e => setMintPrice(e.target.value)} />
                      </div>
                      <button style={btnPink} onClick={handleMintNFT}>Mint NFT</button>
                    </div>
                  </div>
                )}
                {activeTab === 'mynfts' && (
                  nfts.filter(n => n.owner === (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '')).length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🖼️</div>
                      <div style={{ color: '#7d7d8a', marginBottom: '1rem' }}>No NFTs yet</div>
                      <button onClick={() => setActiveTab('create')} style={{ background: 'none', border: '1px solid #f0eff5', borderRadius: '12px', padding: '0.6rem 1.25rem', cursor: 'pointer', fontWeight: '600', color: '#1c1b20' }}>Mint your first</button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      {nfts.filter(n => n.owner === `${address?.slice(0, 6)}...${address?.slice(-4)}`).map(nft => (
                        <div key={nft.id} style={card}>{renderNFTImage(nft, 120)}<div style={{ fontWeight: '700' }}>{nft.name}</div><div style={{ color: '#ff007a', fontWeight: '700' }}>{nft.price} USDC</div></div>
                      ))}
                    </div>
                  )
                )}
                {selectedNft && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedNft(null)}>
                    <div style={{ ...card, maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
                      {renderNFTImage(selectedNft, 180)}
                      <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{selectedNft.name}</div>
                      <div style={{ color: '#7d7d8a', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{selectedNft.description}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', background: '#f9f9fb', borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                        <span style={{ color: '#7d7d8a' }}>Price</span><span style={{ fontWeight: '800', color: '#ff007a' }}>{selectedNft.price} USDC</span>
                      </div>
                      <button style={btnPink} onClick={() => handleBuyNFT(selectedNft)}>Buy for {selectedNft.price} USDC</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── PREDICT ─── */}
            {activePage === 'predict' && (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {[{ id: 'markets' as const, label: 'All Markets' }, { id: 'create' as const, label: 'Create Market' }, { id: 'mymarkets' as const, label: 'My Markets' }].map(t => (
                    <button key={t.id} onClick={() => setPredictTab(t.id)} style={pill(predictTab === t.id)}>{t.label}</button>
                  ))}
                </div>
                {predictTab === 'markets' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    {markets.map(market => (
                      <div key={market.id} onClick={() => { setSelectedMarket(market); setBetOption(0); setBetAmount('') }}
                        style={{ ...card, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <div style={badge(market.resolved ? '#059669' : '#d97706')}>{market.resolved ? '✅ Resolved' : '🔴 Live'}</div>
                          <div style={{ color: '#7d7d8a', fontSize: '0.8rem' }}>{timeLeft(market.endTime)}</div>
                        </div>
                        <div style={{ fontWeight: '700', marginBottom: '1rem', lineHeight: 1.4, color: '#1c1b20' }}>{market.question}</div>
                        {market.options.map((opt, i) => (
                          <div key={i} style={{ marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.85rem' }}>
                              <span style={{ color: market.resolved && market.winningOption === i ? '#059669' : '#1c1b20', fontWeight: market.resolved && market.winningOption === i ? '700' : '400' }}>{market.resolved && market.winningOption === i ? '🏆 ' : ''}{opt}</span>
                              <span style={{ color: '#ff007a', fontWeight: '600' }}>{getOdds(market.pools[i] || 0, market.totalPool)}</span>
                            </div>
                            {/* FIX: bar width uses getOddsNum (number) not getOdds (string) */}
                            <div style={{ background: '#f9f9fb', borderRadius: '99px', height: '5px' }}>
                              <div style={{ background: market.resolved && market.winningOption === i ? '#059669' : '#ff007a', width: `${getOddsNum(market.pools[i] || 0, market.totalPool)}%`, height: '5px', borderRadius: '99px' }} />
                            </div>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f9f9fb', fontSize: '0.85rem' }}>
                          <span style={{ color: '#7d7d8a' }}>Pool</span>
                          <span style={{ fontWeight: '700', color: '#1c1b20' }}>{market.totalPool} USDC</span>
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
                        <div style={{ fontSize: '0.85rem', color: '#7d7d8a', marginBottom: '0.4rem' }}>Question *</div>
                        <input style={input} placeholder="Will BTC hit $200k in 2026?" value={newQuestion} onChange={e => setNewQuestion(e.target.value)} />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#7d7d8a', marginBottom: '0.5rem' }}>Options</div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          {[2, 3, 4].map(n => <button key={n} onClick={() => setNewOptionCount(n)} style={pill(newOptionCount === n)}>{n}</button>)}
                        </div>
                        {Array.from({ length: newOptionCount }).map((_, i) => (
                          <input key={i} style={{ ...input, marginBottom: '0.5rem' }} placeholder={i === 0 ? 'Yes' : i === 1 ? 'No' : `Option ${i + 1}`} value={newOptions[i]} onChange={e => { const o = [...newOptions]; o[i] = e.target.value; setNewOptions(o) }} />
                        ))}
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#7d7d8a', marginBottom: '0.5rem' }}>Duration</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {[{ v: '1', l: '1h' }, { v: '24', l: '1d' }, { v: '72', l: '3d' }, { v: '168', l: '7d' }].map(h => (
                            <button key={h.v} onClick={() => setNewDuration(h.v)} style={{ ...pill(newDuration === h.v), flex: 1 }}>{h.l}</button>
                          ))}
                        </div>
                      </div>
                      <button style={btnGreen} onClick={handleCreateMarket}>Create Market</button>
                    </div>
                  </div>
                )}
                {predictTab === 'mymarkets' && (
                  markets.filter(m => m.creator === (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '')).length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎯</div>
                      <div style={{ color: '#7d7d8a', marginBottom: '1rem' }}>No markets created yet</div>
                      <button onClick={() => setPredictTab('create')} style={{ background: 'none', border: '1px solid #f0eff5', borderRadius: '12px', padding: '0.6rem 1.25rem', cursor: 'pointer', fontWeight: '600', color: '#1c1b20' }}>Create one</button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      {markets.filter(m => m.creator === `${address?.slice(0, 6)}...${address?.slice(-4)}`).map(market => (
                        <div key={market.id} style={card}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <div style={badge(market.resolved ? '#059669' : '#d97706')}>{market.resolved ? '✅ Resolved' : '🔴 Live'}</div>
                            <div style={{ color: '#7d7d8a', fontSize: '0.8rem' }}>{timeLeft(market.endTime)}</div>
                          </div>
                          <div style={{ fontWeight: '700', marginBottom: '1rem' }}>{market.question}</div>
                          {!market.resolved && (
                            <div>
                              <select value={resolveOption} onChange={e => setResolveOption(Number(e.target.value))} style={{ ...input, marginBottom: '0.75rem' }}>
                                {market.options.map((opt, i) => <option key={i} value={i}>{opt}</option>)}
                              </select>
                              <button onClick={() => handleResolveMarket(market)} style={btnGreen}>✅ Resolve</button>
                            </div>
                          )}
                          {market.resolved && <button onClick={() => handleClaimWinnings(market)} style={btnPink}>🏆 Claim Winnings</button>}
                        </div>
                      ))}
                    </div>
                  )
                )}
                {selectedMarket && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedMarket(null)}>
                    <div style={{ ...card, maxWidth: '440px', width: '90%' }} onClick={e => e.stopPropagation()}>
                      <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.5rem' }}>Place Bet</div>
                      <div style={{ background: '#f9f9fb', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontWeight: '600', lineHeight: 1.4, color: '#1c1b20', fontSize: '0.95rem' }}>{selectedMarket.question}</div>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#7d7d8a', marginBottom: '0.5rem' }}>Pick your answer</div>
                        {selectedMarket.options.map((opt, i) => (
                          <button key={i} onClick={() => setBetOption(i)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0.75rem 1rem', border: `1px solid ${betOption === i ? '#ff007a' : '#f0eff5'}`, borderRadius: '12px', background: betOption === i ? '#fff1f5' : 'white', cursor: 'pointer', marginBottom: '0.4rem', fontWeight: betOption === i ? '700' : '400', textAlign: 'left', color: betOption === i ? '#ff007a' : '#1c1b20' }}>
                            <span>{betOption === i ? '✓ ' : ''}{opt}</span>
                            <span style={{ color: '#7d7d8a', fontSize: '0.85rem' }}>{getOdds(selectedMarket.pools[i] || 0, selectedMarket.totalPool)}</span>
                          </button>
                        ))}
                      </div>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#7d7d8a', marginBottom: '0.5rem' }}>Bet amount (USDC)</div>
                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                          {['1', '5', '10', '50'].map(a => <button key={a} onClick={() => setBetAmount(a)} style={{ ...pill(betAmount === a), flex: 1 }}>${a}</button>)}
                        </div>
                        <input style={input} type="number" placeholder="0.00" value={betAmount} onChange={e => setBetAmount(e.target.value)} />
                      </div>
                      {betAmount && (
                        <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#7d7d8a' }}>Potential win</span>
                          <span style={{ color: '#059669', fontWeight: '700' }}>~{selectedMarket.pools[betOption] > 0 ? ((Number(betAmount) / (selectedMarket.pools[betOption] + Number(betAmount))) * (selectedMarket.totalPool + Number(betAmount))).toFixed(2) : Number(betAmount).toFixed(2)} USDC</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => setSelectedMarket(null)} style={{ flex: 1, padding: '0.9rem', background: 'white', border: '1px solid #f0eff5', borderRadius: '14px', cursor: 'pointer', fontWeight: '600', color: '#7d7d8a' }}>Cancel</button>
                        <button onClick={() => handlePlaceBet(selectedMarket)} style={{ ...btnPink, flex: 1 }}>Place Bet 🎯</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── HISTORY ─── */}
            {activePage === 'history' && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>Transaction History</div>
                  <div style={badge('#2563eb')}>{transactions.length} txns</div>
                </div>
                {transactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#7d7d8a' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📭</div>
                    No transactions yet
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f9f9fb' }}>
                        {['Type', 'Amount', 'Asset', 'Hash', 'Date', 'Time', 'Status'].map(h => (
                          <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.8rem', color: '#7d7d8a', fontWeight: '600' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.id} style={{ borderBottom: '1px solid #f9f9fb' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#faf9fb')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                          <td style={{ padding: '0.9rem 0.5rem', fontWeight: '600', color: '#1c1b20' }}>{tx.type === 'Deposit' ? '💰' : tx.type === 'Borrow' ? '🏦' : tx.type.includes('NFT') ? '🖼️' : tx.type.includes('Bet') || tx.type.includes('Market') ? '🎯' : '🔄'} {tx.type}</td>
                          <td style={{ padding: '0.9rem 0.5rem', color: '#ff007a', fontWeight: '700' }}>{tx.amount}</td>
                          <td style={{ padding: '0.9rem 0.5rem', color: '#7d7d8a', fontSize: '0.85rem' }}>{tx.token}</td>
                          <td style={{ padding: '0.9rem 0.5rem', color: '#7d7d8a', fontSize: '0.75rem', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{tx.hash}</td>
                          <td style={{ padding: '0.9rem 0.5rem', color: '#7d7d8a', fontSize: '0.85rem' }}>{tx.date}</td>
                          <td style={{ padding: '0.9rem 0.5rem', color: '#7d7d8a', fontSize: '0.85rem' }}>{tx.time}</td>
                          <td style={{ padding: '0.9rem 0.5rem' }}><span style={badge('#059669')}>{tx.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* TX POPUP */}
      {showTxPopup && pendingTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ ...card, maxWidth: '360px', width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
              {pendingTx.type === 'Deposit' ? '💰' : pendingTx.type === 'Borrow' ? '🏦' : pendingTx.type.includes('NFT') ? '🖼️' : pendingTx.type.includes('Bet') || pendingTx.type.includes('Market') ? '🎯' : '🔄'}
            </div>
            <div style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '0.5rem', color: '#1c1b20' }}>Confirm Transaction</div>
            <div style={{ color: '#7d7d8a', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Review the details below</div>
            <div style={{ background: '#f9f9fb', borderRadius: '14px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              {[['Type', pendingTx.type], ['Amount', pendingTx.amount || '—'], ['Asset', pendingTx.token], ['Network', 'Arc Testnet']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span style={{ color: '#7d7d8a' }}>{k}</span>
                  <span style={{ fontWeight: '600', color: '#1c1b20' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setShowTxPopup(false); setPendingTx(null) }} style={{ flex: 1, padding: '0.9rem', background: 'white', border: '1px solid #f0eff5', borderRadius: '14px', cursor: 'pointer', fontWeight: '600', color: '#7d7d8a' }}>Cancel</button>
              <button onClick={confirmTx} style={{ ...btnPink, flex: 1, borderRadius: '14px' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: 'white', border: `1px solid ${toastType === 'success' ? '#bbf7d0' : '#fecaca'}`, color: toastType === 'success' ? '#059669' : '#dc2626', padding: '0.9rem 1.25rem', borderRadius: '14px', fontWeight: '600', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '0.9rem' }}>
          {toast}
        </div>
      )}
    </div>
  )
}