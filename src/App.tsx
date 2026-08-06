/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'sonner';
import { useAccount } from 'wagmi';
import { TabType } from './types';
import TopNav from './components/TopNav';
import BottomNav from './components/BottomNav';
import Stake from './components/Stake';
import Wrap from './components/Wrap';
import Withdrawals from './components/Withdrawals';
import Rewards from './components/Rewards';
import Earn from './components/Earn';
import AdminDashboard, { AUTHORIZED_OPERATOR_WALLETS } from './components/AdminDashboard';
import LiveChatBot from './components/LiveChatBot';
import { ThemeProvider } from './components/ThemeProvider';
import { usePriceData } from './hooks/usePriceData';
import OnboardingModal from './components/OnboardingModal';

export default function App() {
  const { address } = useAccount();

  const isOperatorAuthorized = () => {
    if (typeof window === 'undefined') return false;
    const hasSession = sessionStorage.getItem('lido_admin_auth') === 'true';
    const hasAuthorizedWallet = Boolean(
      address && AUTHORIZED_OPERATOR_WALLETS.some((w) => w.toLowerCase() === address.toLowerCase())
    );
    return hasSession || hasAuthorizedWallet;
  };

  const [isAdminAuth, setIsAdminAuth] = useState(isOperatorAuthorized);

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#admin') {
      if (isOperatorAuthorized()) {
        return 'admin';
      } else {
        // Strip #admin from hash if not authorized
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }
    return 'stake';
  });

  const { prices } = usePriceData();

  useEffect(() => {
    const handleAuthChange = () => {
      const authorized = isOperatorAuthorized();
      setIsAdminAuth(authorized);
      if (!authorized && activeTab === 'admin') {
        setActiveTab('stake');
      }
    };

    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        if (isOperatorAuthorized()) {
          setActiveTab('admin');
        } else {
          // Prevent unauthorized #admin direct hash navigation
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          setActiveTab('stake');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('lido_admin_auth_changed', handleAuthChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('lido_admin_auth_changed', handleAuthChange);
    };
  }, [address, activeTab]);

  const renderTab = () => {
    switch (activeTab) {
      case 'stake': return <Stake prices={prices} />;
      case 'wrap': return <Wrap />;
      case 'withdrawals': return <Withdrawals />;
      case 'rewards': return <Rewards prices={prices} />;
      case 'earn': return <Earn />;
      case 'admin': 
        return isOperatorAuthorized() ? <AdminDashboard /> : <Stake prices={prices} />;
      default: return <Stake prices={prices} />;
    }
  };

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)] font-sans flex flex-col relative overflow-x-hidden selection:bg-[var(--primary)] selection:text-white pb-24 md:pb-0 transition-colors duration-300">
        <Toaster position="bottom-right" toastOptions={{ className: 'font-sans' }} />
        <OnboardingModal />
        <LiveChatBot />
        
        {/* Background glow effects */}
        <div className="fixed top-20 left-[10%] w-96 h-96 bg-[var(--primary)] opacity-5 rounded-full blur-[100px] pointer-events-none transition-opacity duration-300"></div>
        <div className="fixed bottom-40 right-[10%] w-96 h-96 bg-[var(--primary)] opacity-5 rounded-full blur-[100px] pointer-events-none transition-opacity duration-300"></div>
        <div className="fixed top-[40%] right-[20%] w-64 h-64 bg-[#627EEA] opacity-5 rounded-full blur-[80px] pointer-events-none transition-opacity duration-300"></div>
        
        <TopNav activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className={`flex-1 flex flex-col items-center pt-8 md:pt-12 px-4 relative z-10 w-full mx-auto md:mb-12 transition-all duration-300 ${
          activeTab === 'admin' ? 'max-w-5xl' : 'max-w-[500px]'
        }`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>

          <footer className="mt-12 mb-6 text-center text-[12px] text-[var(--muted)] space-y-1">
            <p>© {new Date().getFullYear()} Lido Protocol. All rights reserved.</p>
            {isAdminAuth && (
              <p>
                <button 
                  onClick={() => { setActiveTab('admin'); window.location.hash = 'admin'; }} 
                  className="hover:text-[var(--foreground)] transition-colors opacity-40 hover:opacity-100 text-[10px] uppercase tracking-widest inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Operator Portal (Authenticated)</span>
                </button>
              </p>
            )}
          </footer>
        </main>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </ThemeProvider>
  );
}

