import { useState } from "react";
import { BrowserProvider } from "ethers";
import { SiweMessage } from "siwe";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function WalletConnect() {
  const [address, setAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signInWithEthereum = async () => {
    try {
      setLoading(true);
      setError("");
      setVerified(false);

      if (!window.ethereum) {
        throw new Error("No Web3 wallet (e.g. MetaMask) detected in browser");
      }

      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      const nonceRes = await fetch("/api/nonce");
      if (!nonceRes.ok) {
        throw new Error("Failed to fetch nonce from server");
      }

      const { nonce } = await nonceRes.json();

      const message = new SiweMessage({
        domain: window.location.host,
        address: walletAddress,
        statement: "Sign in with Ethereum to continue.",
        uri: window.location.origin,
        version: "1",
        chainId: 1,
        nonce,
      });

      const preparedMessage = message.prepareMessage();
      const signedMessage = await signer.signMessage(preparedMessage);

      const verifyRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: preparedMessage,
          signature: signedMessage,
        }),
      });

      let result: any = {};
      try {
        result = await verifyRes.json();
      } catch {
        result = { success: verifyRes.ok };
      }

      if (!verifyRes.ok || result === false || (result.success !== undefined && !result.success)) {
        throw new Error(result.error || "Signature verification failed");
      }

      setAddress(walletAddress);
      setSignature(signedMessage);
      setVerified(true);

      sessionStorage.setItem('lido_admin_auth', 'true');
      sessionStorage.setItem('lido_demo_wallet', walletAddress);
      window.dispatchEvent(new Event('lido_admin_auth_changed'));
      window.dispatchEvent(new CustomEvent('lido_wallet_connected', { detail: { address: walletAddress } }));
    } catch (err: any) {
      setError(err?.message || "Something went wrong during sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full mx-auto shadow-md">
      <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Sign In with Ethereum (SIWE)</h3>
      <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
        Connect your wallet and sign a cryptographically secure message to verify ownership.
      </p>

      <button
        onClick={signInWithEthereum}
        disabled={loading}
        className="w-full py-3 px-4 bg-[var(--primary)] hover:opacity-90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm flex items-center justify-center gap-2"
      >
        {loading ? "Signing in..." : "Connect Wallet & Sign"}
      </button>

      {address && (
        <div className="mt-4 p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] text-xs font-mono text-[var(--foreground)] break-all">
          <span className="text-[var(--muted)] font-sans block mb-1">Connected Address:</span>
          {address}
        </div>
      )}

      {verified && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
          <span>✓ Verified Session Active</span>
        </div>
      )}

      {signature && (
        <div className="mt-3 p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] text-[11px] font-mono text-[var(--muted)] break-all max-h-24 overflow-y-auto">
          <span className="text-[var(--foreground)] font-sans font-semibold block mb-1">Signature output:</span>
          {signature}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
