import React from 'react';
import { useAccount, useChainId, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { sepolia } from '@reown/appkit/networks';
import { isAddress } from 'viem';
import { CheckCircle2, CircleAlert, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAppKit } from '@reown/appkit/react';

const registryAddress = (import.meta as any).env?.VITE_STAKELAB_REGISTRY_ADDRESS as `0x${string}` | undefined;
const registryAbi = [
  { type: 'function', name: 'register', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'isRegistered', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'event', name: 'Registered', anonymous: false, inputs: [{ indexed: true, name: 'account', type: 'address' }, { indexed: false, name: 'timestamp', type: 'uint64' }] },
] as const;

export default function Registry() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { writeContract, data: hash, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError: receiptError, data: receipt } = useWaitForTransactionReceipt({ hash });

  const configured = Boolean(registryAddress && isAddress(registryAddress));
  const onSepolia = chainId === sepolia.id;
  const busy = isWriting || isConfirming || isSwitching;

  const register = () => {
    if (!isConnected || !address) {
      open();
      return;
    }
    if (!onSepolia) {
      toast.error('Switch your wallet to Sepolia before registering.');
      switchChain({ chainId: sepolia.id });
      return;
    }
    if (!configured || !registryAddress) {
      toast.error('The testnet registry contract has not been configured yet.');
      return;
    }
    writeContract({
      address: registryAddress,
      abi: registryAbi,
      functionName: 'register',
      account: address,
      chainId: sepolia.id,
    });
  };

  React.useEffect(() => {
    if (writeError) toast.error(writeError.message.slice(0, 180));
  }, [writeError]);
  React.useEffect(() => {
    if (receiptError) toast.error('The transaction could not be confirmed. Check the explorer before retrying.');
  }, [receiptError]);
  React.useEffect(() => {
    if (isSuccess && hash) toast.success('Registration confirmed on Sepolia.');
  }, [isSuccess, hash]);

  return (
    <section className="w-full max-w-xl mx-auto space-y-5">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted)]">
          <span className={`h-2 w-2 rounded-full ${onSepolia ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          Sepolia testnet only
        </div>
        <h1 className="font-semibold tracking-tight">On-chain wallet registration</h1>
        <p className="text-sm text-[var(--muted)]">Submit a registration transaction to the configured testnet contract. Your wallet will show the exact transaction details before you approve it.</p>
      </header>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 md:p-6 space-y-5 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><ShieldCheck size={18} /></div>
          <div className="min-w-0">
            <h2 className="font-semibold">Registration record</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">This writes only your wallet address and a timestamp to the configured registry. It does not transfer tokens, request an allowance, or stake assets. You pay Sepolia testnet gas only.</p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3">
            <span className="text-[var(--muted)]">Wallet</span>
            <span className="font-mono text-right break-all">{address ? `${address.slice(0, 8)}…${address.slice(-6)}` : 'Not connected'}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3">
            <span className="text-[var(--muted)]">Network</span>
            <span className={onSepolia ? 'text-emerald-400' : 'text-amber-300'}>{onSepolia ? 'Sepolia (11155111)' : 'Switch to Sepolia'}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="text-[var(--muted)]">Contract</span>
            <span className="font-mono text-right break-all">{configured ? registryAddress : 'Not configured'}</span>
          </div>
        </div>

        {!configured && <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100"><CircleAlert size={16} className="mt-0.5 shrink-0" /><p>Deploy the included StakeLabRegistry.sol contract to Sepolia and set <code>VITE_STAKELAB_REGISTRY_ADDRESS</code> to its address. Registration stays disabled until a valid address is configured.</p></div>}

        <button onClick={register} disabled={busy || (configured && !onSepolia && isSwitching)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {busy && <Loader2 size={16} className="animate-spin" />}
          {!isConnected ? 'Connect wallet' : isWriting ? 'Awaiting wallet approval…' : isConfirming ? 'Confirming on-chain…' : !configured ? 'Registry not configured' : !onSepolia ? 'Switch to Sepolia' : 'Register wallet on Sepolia'}
        </button>

        {isSuccess && hash && <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-emerald-300"><CheckCircle2 size={17} /> Registration confirmed</div>
          <p className="mt-2 break-all font-mono text-xs text-[var(--muted)]">{hash}</p>
          {receipt?.blockNumber !== undefined && <p className="mt-1 text-xs text-[var(--muted)]">Block {receipt.blockNumber.toString()}</p>}
          <a className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline" href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer">View transaction on Sepolia Etherscan <ExternalLink size={13} /></a>
        </div>}
        {hash && !isSuccess && !receiptError && <p className="text-xs text-[var(--muted)]">Transaction hash: <a className="underline" href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer">{hash.slice(0, 16)}…</a>. Waiting for confirmation.</p>}
      </div>

      <p className="text-center text-[11px] leading-relaxed text-[var(--muted)]">StakeLab is an independent demonstration project and is not affiliated with, endorsed by, or operated by Lido. This page is testnet-only and is not a staking service.</p>
    </section>
  );
}
