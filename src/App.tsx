import React from 'react';

export default function App() {
  return (
    <main className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-white">
      <iframe
        title="Lido staking application"
        src="https://stake.lido.fi/"
        className="block h-full w-full border-0"
        loading="eager"
        allow="clipboard-read; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </main>
  );
}
