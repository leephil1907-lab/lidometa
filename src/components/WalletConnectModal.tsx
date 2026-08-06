import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, Shield, Check, Copy, ExternalLink, LogOut, Sparkles, Key, AlertCircle } from 'lucide-react';
import { useAccount, useConnect, useDisconnect, useSignMessage, useBalance } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { BrowserProvider } from 'ethers';
import { SiweMessage } from 'siwe';
import { toast } from 'sonner';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROTOCOL_ACCOUNTS = [
  { name: 'Protocol Fee Owner & Admin', address: '0xEfc5859335A58d64A5e8E01d02c5241c852CBD40' },
  { name: 'Relayer Vault Contract', address: '0xF02D24A7bB10d0dBF3da2119d594B7a905dDC091' },
  { name: 'Public Staker Address', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
];

export default function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { data: balanceData } = useBalance({ address });

  const [hasInjectedWallet, setHasInjectedWallet] = useState(false);
  const [injectedName, setInjectedName] = useState('Browser Wallet');
  const [copied, setCopied] = useState(false);
  const [isSiweVerifying, setIsSiweVerifying] = useState(false);
  const [siweAuthenticated, setSiweAuthenticated] = useState(false);
  const [customAddress, setCustomAddress] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      setHasInjectedWallet(true);
      if (window.ethereum.isMetaMask) {
        setInjectedName('MetaMask');
      } else if (window.ethereum.isCoinbaseWallet) {
        setInjectedName('Coinbase Wallet');
      } else if (window.ethereum.isRabby) {
        setInjectedName('Rabby Wallet');
      } else {
        setInjectedName('Injected Browser Wallet');
      }
    }

    if (typeof window !== 'undefined') {
      const isAuth = sessionStorage.getItem('lido_admin_auth') === 'true';
      setSiweAuthenticated(isAuth);
    }
  }, [address]);

  const handleConnectInjected = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Try direct eth_requestAccounts via window.ethereum first
        const provider = new BrowserProvider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        
        // Find wagmi injected connector if available
        const injectedConn = connectors.find((c) => c.id === 'injected' || c.name.toLowerCase().includes('injected') || c.name.toLowerCase().includes('metamask'));
        if (injectedConn) {
          connect({ connector: injectedConn });
        }
        
        toast.success(`Connected to ${injectedName}`);
        onClose();
      } else {
        // Fallback to Reown AppKit modal
        open();
        onClose();
      }
    } catch (err: any) {
      console.error('Injected connect error:', err);
      toast.error('Failed to connect injected wallet', {
        description: err?.message || 'User denied wallet connection request.'
      });
    }
  };

  const handleOpenAppKit = () => {
    onClose();
    setTimeout(() => {
      open();
    }, 100);
  };

  const handleConnectDemoWallet = (demoAddr: string) => {
    try {
      sessionStorage.setItem('lido_demo_wallet', demoAddr);
      sessionStorage.setItem('lido_admin_auth', 'true');
      window.dispatchEvent(new Event('lido_admin_auth_changed'));
      
      // Dispatch custom wallet connect event if needed
      window.dispatchEvent(new CustomEvent('lido_wallet_connected', { detail: { address: demoAddr } }));
      
      toast.success('Connected Account Address', {
        description: `${demoAddr.slice(0, 6)}...${demoAddr.slice(-4)}`
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSiweSignIn = async () => {
    if (!address && typeof window !== 'undefined' && !window.ethereum) {
      toast.error('Please connect a Web3 wallet first.');
      return;
    }

    setIsSiweVerifying(true);
    try {
      let targetAddr = address;
      let signer: any = null;

      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        targetAddr = await signer.getAddress();
      }

      if (!targetAddr) {
        throw new Error('No wallet address found');
      }

      // 1. Get Nonce
      const nonceRes = await fetch('/api/nonce');
      if (!nonceRes.ok) throw new Error('Failed to fetch SIWE nonce from server');
      const { nonce } = await nonceRes.json();

      // 2. Prepare SIWE Message
      const messageObj = new SiweMessage({
        domain: window.location.host,
        address: targetAddr,
        statement: 'Sign in with Ethereum to verify session on Lido Stake Interface.',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce,
      });

      const preparedMessage = messageObj.prepareMessage();
      let signedMessage = '';

      if (signer) {
        signedMessage = await signer.signMessage(preparedMessage);
      } else {
        signedMessage = await signMessageAsync({
          account: (address || '0x0000000000000000000000000000000000000000') as `0x${string}`,
          message: preparedMessage,
        });
      }

      // 3. Verify on server
      const verifyRes = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: preparedMessage,
          signature: signedMessage,
        }),
      });

      if (!verifyRes.ok) {
        throw new Error('SIWE signature verification failed on server');
      }

      sessionStorage.setItem('lido_admin_auth', 'true');
      setSiweAuthenticated(true);
      window.dispatchEvent(new Event('lido_admin_auth_changed'));

      toast.success('SIWE Verification Successful!', {
        description: 'Session cryptographically verified and active.'
      });
    } catch (err: any) {
      console.error('SIWE Error:', err);
      toast.error('SIWE Sign In Failed', {
        description: err?.message || 'Signature rejected or verification error.'
      });
    } finally {
      setIsSiweVerifying(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    disconnect();
    sessionStorage.removeItem('lido_demo_wallet');
    sessionStorage.removeItem('lido_admin_auth');
    window.dispatchEvent(new Event('lido_admin_auth_changed'));
    toast.info('Wallet disconnected');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl z-10 overflow-hidden text-[var(--foreground)]"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-5">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)] leading-snug">
                  {isConnected ? 'Wallet Details' : 'Connect Wallet'}
                </h3>
                <p className="text-[11px] text-[var(--muted)]">
                  {isConnected ? 'Connected to Ethereum Network' : 'Choose your preferred wallet option'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--input-bg)] border border-[var(--border)] hover:bg-neutral-800 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Connected View */}
          {isConnected && address ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>Address</span>
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-[var(--card)] p-2.5 rounded-lg border border-[var(--border)] font-mono text-xs text-[var(--foreground)] break-all">
                  <span>{`${address.substring(0, 10)}...${address.substring(address.length - 8)}`}</span>
                  <button
                    onClick={() => handleCopy(address)}
                    className="p-1.5 text-[var(--muted)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                    title="Copy Address"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>

                {balanceData && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[var(--muted)]">Balance</span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {(balanceData as any).formatted || (Number(balanceData.value) / 10 ** balanceData.decimals).toFixed(4)} {balanceData.symbol}
                    </span>
                  </div>
                )}
              </div>

              {/* SIWE Verification Section */}
              <div className="p-3.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield size={16} className={siweAuthenticated ? 'text-emerald-400' : 'text-amber-400'} />
                    <span className="text-xs font-semibold">SIWE Session Verification</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${siweAuthenticated ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {siweAuthenticated ? 'Verified' : 'Optional'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Sign an off-chain cryptographic SIWE message to authenticate operator status on the server.
                </p>
                {!siweAuthenticated && (
                  <button
                    onClick={handleSiweSignIn}
                    disabled={isSiweVerifying}
                    className="w-full mt-1 py-2 px-3 bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 text-[var(--primary)] text-xs font-bold rounded-lg border border-[var(--primary)]/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSiweVerifying ? (
                      <span>Verifying Signature...</span>
                    ) : (
                      <>
                        <Key size={14} />
                        <span>Sign SIWE Verification Message</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Disconnect button */}
              <button
                onClick={handleDisconnect}
                className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <LogOut size={16} />
                <span>Disconnect Wallet</span>
              </button>
            </div>
          ) : (
            /* Not Connected View */
            <div className="space-y-4">
              {/* Option 1: Injected / MetaMask */}
              {hasInjectedWallet && (
                <button
                  onClick={handleConnectInjected}
                  className="w-full p-3.5 rounded-xl bg-[var(--input-bg)] hover:bg-[var(--primary)]/10 border border-[var(--border)] hover:border-[var(--primary)]/40 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                      🦊
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold group-hover:text-[var(--primary)] transition-colors">
                        {injectedName}
                      </div>
                      <div className="text-[10px] text-[var(--muted)]">
                        Direct connection via detected browser extension
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--primary)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Connect →
                  </span>
                </button>
              )}

              {/* Option 2: Reown AppKit / WalletConnect Modal */}
              <button
                onClick={handleOpenAppKit}
                className="w-full p-3.5 rounded-xl bg-[var(--input-bg)] hover:bg-[var(--primary)]/10 border border-[var(--border)] hover:border-[var(--primary)]/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                    🌐
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold group-hover:text-[var(--primary)] transition-colors">
                      WalletConnect / Reown Modal
                    </div>
                    <div className="text-[10px] text-[var(--muted)]">
                      QR Code, Mobile Wallets, Coinbase, Phantom & 300+ options
                    </div>
                  </div>
                </div>
                <span className="text-xs text-[var(--primary)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Open Modal →
                </span>
              </button>

              {/* Option 3: Protocol Accounts & Manual Address Connection */}
              <div className="pt-2 border-t border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted)] px-1">
                  <span>Protocol Accounts & Manual Connection</span>
                  <span className="text-[10px] bg-[var(--primary)]/15 text-[var(--primary)] px-1.5 py-0.5 rounded border border-[var(--primary)]/20">
                    Direct Key Access
                  </span>
                </div>

                <div className="space-y-1.5">
                  {PROTOCOL_ACCOUNTS.map((wallet) => (
                    <button
                      key={wallet.address}
                      onClick={() => handleConnectDemoWallet(wallet.address)}
                      className="w-full p-2.5 rounded-lg bg-[var(--card)] hover:bg-[var(--input-bg)] border border-[var(--border)] hover:border-[var(--primary)]/30 text-left transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="text-[11px] font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                          {wallet.name}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--muted)]">
                          {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded font-semibold opacity-80 group-hover:opacity-100">
                        Select
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom Wallet Address Input */}
                <div className="pt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter custom 0x address..."
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    className="flex-1 bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--primary)] rounded-lg px-3 py-1.5 text-xs font-mono outline-none text-[var(--foreground)]"
                  />
                  <button
                    onClick={() => {
                      if (customAddress.startsWith('0x') && customAddress.length === 42) {
                        handleConnectDemoWallet(customAddress);
                      } else {
                        toast.error('Invalid Ethereum address format (must start with 0x and be 42 characters)');
                      }
                    }}
                    className="px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all cursor-pointer"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
