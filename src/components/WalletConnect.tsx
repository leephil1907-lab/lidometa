export default function WalletConnect() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full mx-auto shadow-md">
      <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Wallet sign-in unavailable</h3>
      <p className="text-sm text-[var(--muted)] leading-relaxed">
        This interface does not request message signatures for sign-in or administrator access. Use the official Lido application for staking actions.
      </p>
      <a href="https://stake.lido.fi/" rel="noopener noreferrer" className="mt-4 inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-white font-semibold">
        Open official Lido
      </a>
    </div>
  );
}
