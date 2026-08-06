import { useState, useEffect } from 'react';

export function usePriceData() {
  const [prices, setPrices] = useState({ eth: 3000, steth: 3000 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,staked-ether&vs_currencies=usd');
        if (response.ok) {
          const data = await response.json();
          setPrices({
            eth: data.ethereum?.usd || 3000,
            steth: data['staked-ether']?.usd || 3000,
          });
        }
      } catch {
        // Fallback gracefully without console noise
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  return { prices, loading };
}
