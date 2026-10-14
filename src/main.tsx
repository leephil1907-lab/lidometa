import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, arbitrum } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

const queryClient = new QueryClient();

// Setup Reown AppKit Project ID (fallback if not provided in env)
const envProjectId = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_REOWN_PROJECT_ID : undefined;
const projectId = envProjectId || 'b56e18d47c72ab683b10814fe9495694';

if (!envProjectId) {
  console.warn('VITE_REOWN_PROJECT_ID is not set. Please set it in AI Studio settings.');
}


const metadata = {
  name: 'Lido Stake UI',
  description: 'Lido Stake Interface with Reown AppKit',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
};

const networks: [any, ...any[]] = [mainnet, arbitrum];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false
});

// Intercept network requests and console errors to prevent 'Analytics SDK: Failed to fetch' CORS/network noise
if (typeof window !== 'undefined') {
  const origError = console.error;
  console.error = function (...args: any[]) {
    const msg = args.map((a) => String(a?.message || a || '')).join(' ');
    if (
      msg.includes('Analytics SDK') ||
      msg.includes('pulse.walletconnect') ||
      msg.includes('events')
    ) {
      return;
    }
    origError.apply(console, args);
  };

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = async function (...args) {
      let url = '';
      try {
        if (typeof args[0] === 'string') {
          url = args[0];
        } else if (args[0] && typeof args[0] === 'object') {
          url = (args[0] as Request)?.url || args[0].toString() || '';
        }
      } catch (e) {
        url = '';
      }

      // ONLY intercept telemetry/events endpoints, NEVER wallet listing endpoints (like getWallets)
      if (
        url.includes('pulse.walletconnect') ||
        url.includes('/events')
      ) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      try {
        return await originalFetch.apply(this, args);
      } catch (err: any) {
        const errStr = String(err?.message || err || '');
        if (
          url.includes('pulse.walletconnect') ||
          url.includes('/events') ||
          errStr.includes('Analytics SDK')
        ) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw err;
      }
    };
  }

  // Intercept XMLHttpRequest for Analytics SDK
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
    const urlStr = String(url);
    if (
      urlStr.includes('pulse.walletconnect') ||
      urlStr.includes('/events')
    ) {
      Object.defineProperty(this, 'send', {
        value: function () {
          Object.defineProperty(this, 'readyState', { value: 4 });
          Object.defineProperty(this, 'status', { value: 200 });
          Object.defineProperty(this, 'responseText', { value: '{"success":true}' });
          this.dispatchEvent(new Event('load'));
          this.dispatchEvent(new Event('loadend'));
        },
        writable: true,
      });
    }
    return originalXhrOpen.apply(this, [method, url, ...rest] as any);
  };

  // Catch any residual unhandled promise rejections or runtime errors from Analytics SDK
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event?.reason?.message || event?.reason || '');
    if (
      reasonStr.includes('Analytics SDK') ||
      reasonStr.includes('pulse.walletconnect')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    const msg = String(event?.message || event?.error || '');
    if (
      msg.includes('Analytics SDK') ||
      msg.includes('pulse.walletconnect')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

// Explicitly initialize Reown AppKit instance and bind to window/export for UI components
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  allWallets: 'SHOW',
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
});

if (typeof window !== 'undefined') {
  (window as any).appKit = appKit;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
