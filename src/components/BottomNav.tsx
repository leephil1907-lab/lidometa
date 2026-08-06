import React from 'react';
import { TabType } from '../types';
import { Zap, Box, ArrowDownCircle, Wallet, TrendingUp } from 'lucide-react';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs = [
    { id: 'stake', label: 'Stake', icon: Zap, isNew: false },
    { id: 'wrap', label: 'Wrap', icon: Box, isNew: false },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowDownCircle, isNew: false },
    { id: 'rewards', label: 'Rewards', icon: Wallet, isNew: false },
    { id: 'earn', label: 'Earn', icon: TrendingUp, isNew: true },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 w-full h-[84px] bg-[var(--background)]/95 backdrop-blur-lg border-t border-[var(--border)] flex items-center justify-around px-1 z-40 md:hidden pb-4 transition-colors duration-300">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className="flex flex-col items-center justify-center space-y-1 relative w-14 h-full cursor-pointer"
          >
            {tab.isNew && (
              <div className="absolute top-0 right-1 bg-[#FF4B4B] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
                NEW
              </div>
            )}
            <div className={`transition-colors duration-300 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
