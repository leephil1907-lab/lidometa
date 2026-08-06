import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, Coins, Lock } from 'lucide-react';

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already seen the onboarding modal
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 z-50 shadow-xl overflow-hidden"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center mb-4">
                <Shield size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Lido Staking</h2>
              <p className="text-[var(--muted-foreground)] text-sm">
                Stake your ETH securely and earn daily rewards. Here's what you need to know:
              </p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center shrink-0">
                  <Coins size={20} className="text-[var(--foreground)]" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-sm">Stake ETH, receive stETH</h3>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    When you stake your ETH, you receive stETH in return, representing your staked amount plus rewards.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center shrink-0">
                  <Lock size={20} className="text-[var(--foreground)]" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-sm">Safety First</h3>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Ensure you are connected to the official Lido app. Always verify transaction details in your wallet before signing.
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="w-full bg-[var(--primary)] hover:bg-[#009bf2] text-white font-semibold py-3 rounded-xl transition-colors active:scale-[0.98]"
            >
              I Understand, Get Started
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
