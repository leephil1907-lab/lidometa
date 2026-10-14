import { useState, useEffect } from 'react';

export function usePriceData() {
  const [prices, setPrices] = useState({ eth: 0, steth: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,staked-ether&vs_currencies=usd');
        if (!response.ok) throw new Error('Price service unavailable');
        const data = await response.json();
        const eth = data.ethereum?.usd;
        const steth = data['staked-ether']?.usd;
        if (active && Number.isFinite(eth) && Number.isFinite(steth)) setPrices({ eth, steth });
      } catch {
        if (active) setPrices({ eth: 0, steth: 0 });
      } finally { if (active) setLoading(false); }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => { active = false; clearInterval(interval); };
  }, []);
  return { prices, loading };
}
