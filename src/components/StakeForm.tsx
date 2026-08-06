"use client";

import { useState } from "react";
import { BrowserProvider } from "ethers";
import { stakeETH } from "@/app/lib/lido/staking";

export default function StakeForm() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleStake = async () => {
    try {
      setLoading(true);
      setError("");
      setTxHash("");

      if (!window.ethereum) throw new Error("No wallet detected");
      if (!amount || parseFloat(amount) <= 0) throw new Error("Invalid amount");

      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();

      const hash = await stakeETH(signer, amount);
      setTxHash(hash);
      setAmount("");
    } catch (err: any) {
      setError(err?.message || "Staking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1A1D24] border border-gray-800 rounded-2xl p-6 w-full max-w-md">
      <h3 className="text-xl font-bold text-white mb-4">Stake ETH</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-gray-400 text-sm">Amount (ETH)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full mt-1 px-4 py-3 bg-[#0B0E11] border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00A3FF]"
          />
        </div>

        <div className="text-sm text-gray-400">
          You will receive ~{amount || "0"} stETH
        </div>

        <button
          onClick={handleStake}
          disabled={loading}
          className="w-full py-3 bg-[#00A3FF] hover:bg-[#0088DD] text-white font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? "Confirm in wallet..." : "Stake ETH"}
        </button>

        {txHash && (
          <a
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            className="block text-center text-[#00A3FF] text-sm hover:underline"
            rel="noreferrer"
          >
            View on Etherscan ↗
          </a>
        )}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}
