import React, { useState } from 'react';
import { Bell, Sun, Moon, Copy, Check, Shield } from 'lucide-react';
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

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;

    try {
      navigator.clipboard.writeText(address);
    } catch {
      // Fallback
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
        <button 
          className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors duration-300 shadow-sm cursor-pointer"
          title="Notifications"
        >
          <Bell size={18} />
        </button>

        {isConnected && address ? (
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button 
              onClick={() => open()}
              className="px-3.5 py-2 bg-[var(--primary)] hover:opacity-90 text-white text-[14px] font-bold rounded-full transition-all flex items-center space-x-2 shadow-sm cursor-pointer"
              title="Wallet settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
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
            onClick={() => open()}
            className="px-4 py-2 bg-[var(--primary)] hover:opacity-90 text-white text-[14px] font-bold rounded-full transition-all flex items-center space-x-2 shadow-sm cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
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
