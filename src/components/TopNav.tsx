import React, { useState, useEffect } from 'react';
import { Bell, Sun, Moon, Copy, Check, Wallet, ShieldCheck } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useTheme } from './ThemeProvider';
import { TabType } from '../types';

interface TopNavProps {
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
}

export default function TopNav({ activeTab, setActiveTab }: TopNavProps) {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { theme, setTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const checkVerifiedStatus = () => {
      if (!address) {
        setIsVerified(false);
        return;
      }
      if (typeof window !== 'undefined') {
        const addr = address.toLowerCase();
        const connectedSig = sessionStorage.getItem(`lido_connected_sig_${addr}`) === 'true';
        const sigApproved = sessionStorage.getItem(`lido_sig_approved_${addr}`) === 'true';
        const adminAuth = sessionStorage.getItem('lido_admin_auth') === 'true';
        setIsVerified(connectedSig || sigApproved || adminAuth);
      }
    };

    checkVerifiedStatus();
    window.addEventListener('lido_verification_changed', checkVerifiedStatus);
    window.addEventListener('lido_admin_auth_changed', checkVerifiedStatus);
    window.addEventListener('storage', checkVerifiedStatus);

    return () => {
      window.removeEventListener('lido_verification_changed', checkVerifiedStatus);
      window.removeEventListener('lido_admin_auth_changed', checkVerifiedStatus);
      window.removeEventListener('storage', checkVerifiedStatus);
    };
  }, [address]);

  const handleOpenWallet = () => {
    try {
      open();
    } catch (e) {
      console.warn('AppKit open:', e);
    }
  };

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;

    try {
      navigator.clipboard.writeText(address);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setCopied(true);
    toast.success('Address copied to clipboard!', {
      description: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    });

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <nav className="h-[72px] px-4 md:px-6 flex items-center justify-between sticky top-0 z-50 bg-[var(--nav-bg)] backdrop-blur-md border-b border-[var(--border)] transition-colors duration-300">
      <div className="flex items-center space-x-8">
        <div 
          onClick={() => setActiveTab && setActiveTab('stake')}
          className="flex items-center space-x-3 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center p-[1px]">
            <img src="https://cryptologos.cc/logos/lido-dao-ldo-logo.svg" alt="Lido" className="w-full h-full" />
          </div>
          <span className="text-[20px] font-bold tracking-tight text-[var(--foreground)]">Lido Stake</span>
        </div>
        
        {activeTab && setActiveTab && (
          <div className="hidden md:flex items-center space-x-6">
            {['stake', 'wrap', 'withdrawals', 'rewards', 'earn'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabType)}
                className={`text-[14px] font-medium capitalize transition-colors duration-300 cursor-pointer ${
                  activeTab === tab ? 'text-[var(--primary)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Network indicator pill */}
        <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-full text-[12px] font-medium text-[var(--foreground)] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Ethereum</span>
        </div>

        <button 
          className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors duration-300 shadow-sm cursor-pointer"
          title="Notifications"
        >
          <Bell size={18} />
        </button>

        {isConnected && address ? (
          <div className="flex items-center space-x-1 sm:space-x-2">
            {isVerified && (
              <div 
                className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-[12px] font-bold shadow-xs animate-in fade-in"
                title="Wallet Signature Request Approved & Verified"
              >
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Verified</span>
              </div>
            )}

            <button 
              onClick={handleOpenWallet}
              className="px-3.5 py-2 bg-[var(--primary)] hover:opacity-90 text-white text-[14px] font-bold rounded-full transition-all flex items-center space-x-2 shadow-sm cursor-pointer"
              title="Wallet details"
            >
              <Wallet size={16} />
              <span>{`${address.substring(0, 6)}...${address.substring(address.length - 4)}`}</span>
            </button>

            <button
              onClick={handleCopyAddress}
              className="w-10 h-10 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] text-[var(--muted)] hover:text-[var(--primary)] rounded-full transition-all flex items-center justify-center shadow-sm cursor-pointer group"
              title="Copy Address"
              aria-label="Copy wallet address"
            >
              {copied ? (
                <Check size={16} className="text-emerald-500" />
              ) : (
                <Copy size={16} className="transition-transform group-hover:scale-110" />
              )}
            </button>
          </div>
        ) : (
          <button 
            onClick={handleOpenWallet}
            className="px-4 py-2 bg-[var(--primary)] hover:opacity-90 text-white text-[14px] font-bold rounded-full transition-all flex items-center space-x-2 shadow-sm cursor-pointer"
          >
            <Wallet size={16} />
            <span>Connect wallet</span>
          </button>
        )}

        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors duration-300 shadow-sm cursor-pointer"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </nav>
  );
}
