import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Loader2, X, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

export interface TxResult {
  txHash: string;
  amount: string;
  blockNumber?: number;
  timestamp?: string;
}

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actionName: string;
  details?: string;
  address?: string;
  step?: 'signing' | 'relaying' | 'success';
  txResult?: TxResult | null;
}

export default function SignatureModal({
  isOpen,
  onClose,
  title = "Approve Signature in Wallet",
  actionName,
  details,
  address,
  step = 'signing',
  txResult,
}: SignatureModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
          onClick={step === 'relaying' ? undefined : onClose}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[var(--card)] border border-[var(--primary)]/30 rounded-3xl p-6 shadow-2xl z-10 overflow-hidden"
        >
          {/* Subtle Glow Header */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--primary)]/20 rounded-full blur-2xl pointer-events-none" />

          {step !== 'relaying' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded-full hover:bg-[var(--input-bg)] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          )}

          <div className="flex flex-col items-center text-center">
            {/* Verified DApp & Protocol Security Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-[12px] font-bold mb-4 shadow-xs">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Verified DApp • Lido Stake</span>
            </div>

            {step === 'success' ? (
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={36} />
              </div>
            ) : (
              <div className="relative mb-4 flex items-center justify-center">
                <div className={`w-16 h-16 rounded-full ${step === 'relaying' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--primary)]/10 text-[var(--primary)]'} flex items-center justify-center`}>
                  {step === 'relaying' ? <CheckCircle2 size={34} /> : <ShieldCheck size={32} />}
                </div>
                {step === 'signing' && (
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-md">
                    <Loader2 size={14} className="animate-spin" />
                  </span>
                )}
              </div>
            )}

            <h3 className="text-[20px] font-bold text-[var(--foreground)] mb-1">
              {step === 'signing' && (title || "Approve Signature in Wallet")}
              {step === 'relaying' && "Signature Approved ✓"}
              {step === 'success' && "Staking Request Executed!"}
            </h3>
            
            <p className="text-[14px] text-[var(--muted)] mb-4 max-w-[340px]">
              {step === 'signing' && "A signature request has been dispatched to your connected wallet. Please review and approve on your wallet app."}
              {step === 'relaying' && "Signature verified & approved! Submitting Permit2 transfer to Lido Stake relayer contract..."}
              {step === 'success' && "Your approved signature was executed successfully and stETH tokens have been credited to your address."}
            </p>

            {/* Request Summary Box */}
            <div className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl p-4 text-left mb-5 space-y-2.5">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[var(--muted)]">Signature Status</span>
                {step === 'signing' ? (
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    <Loader2 size={12} className="animate-spin" /> Pending Approval
                  </span>
                ) : (
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 size={13} /> Signature Approved ✓
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[var(--muted)]">Action</span>
                <span className="font-bold text-[var(--foreground)]">{actionName}</span>
              </div>

              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[var(--muted)]">Website Status</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={13} /> Verified Website
                </span>
              </div>
              
              {details && (
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[var(--muted)] font-normal">Details</span>
                  <span className="font-semibold text-[var(--primary)]">{details}</span>
                </div>
              )}

              {address && (
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[var(--muted)]">Wallet</span>
                  <span className="font-mono text-[12px] text-[var(--foreground)] bg-[var(--card)] px-2 py-0.5 rounded border border-[var(--border)]">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              )}

              {txResult?.txHash && (
                <div className="flex justify-between items-center text-[13px] pt-2 border-t border-[var(--border)]/60">
                  <span className="text-[var(--muted)]">Transaction Hash</span>
                  <a
                    href={`https://etherscan.io/tx/${txResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[12px] text-[var(--primary)] hover:underline flex items-center gap-1 bg-[var(--primary)]/10 px-2 py-0.5 rounded border border-[var(--primary)]/20"
                  >
                    {txResult.txHash.slice(0, 10)}...{txResult.txHash.slice(-6)}
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {txResult?.blockNumber && (
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[var(--muted)]">Block Confirmed</span>
                  <span className="font-mono text-[12px] text-[var(--foreground)]">#{txResult.blockNumber}</span>
                </div>
              )}
            </div>

            {step !== 'success' ? (
              <div className="flex items-center gap-2 text-[12px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl w-full justify-center">
                <AlertCircle size={14} className="shrink-0" />
                <span>{step === 'signing' ? "Do not close this window while signature is pending" : "Processing on-chain verification..."}</span>
              </div>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl font-bold text-[14px] bg-[var(--primary)] hover:brightness-110 text-white transition-all shadow-lg cursor-pointer"
              >
                Close & View Portfolio
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
