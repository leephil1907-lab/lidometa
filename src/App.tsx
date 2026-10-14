import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

const OFFICIAL_LIDO_STAKING = 'https://stake.lido.fi/';

export default function App() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="/" className="text-base font-semibold tracking-tight">Stake Portal <span className="font-normal text-[var(--muted)]">· Independent integration</span></a>
        <a href={OFFICIAL_LIDO_STAKING} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--card)]">
          Open official Lido <ExternalLink size={14} />
        </a>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6">
        <div className="mb-5 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted)]">
            <ShieldCheck size={14} /> Ethereum Mainnet · Official staking interface
          </div>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">Stake ETH securely through Lido</h1>
          <p className="text-sm leading-6 text-[var(--muted)]">
            This is an independent interface that embeds Lido’s official staking application. It is not operated by or affiliated with Lido. Review the transaction details in your wallet before signing.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xl">
          <iframe
            title="Official Lido staking application"
            src={OFFICIAL_LIDO_STAKING}
            className="block min-h-[760px] w-full border-0"
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="clipboard-read; clipboard-write"
          />
        </div>

        <p className="mx-auto mt-4 max-w-3xl text-xs leading-5 text-[var(--muted)]">
          Wallet connection and transaction execution are handled by the official Lido application. This site does not request token approvals, collect seed phrases, or route assets through a custom relayer. If the embedded application does not load, use the official site directly.
        </p>
      </section>
    </main>
  );
}
