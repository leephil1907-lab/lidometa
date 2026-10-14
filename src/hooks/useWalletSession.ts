import { useEffect, useRef, useState } from 'react';
import { useAccount, useChainId, useDisconnect } from 'wagmi';

export type WalletSessionState = {
  address?: `0x${string}`;
  chainId: number;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  accountChanged: boolean;
  disconnect: () => void;
};

/**
 * Small non-visual wallet-session hook. Session state is held in memory only;
 * it is not persisted to localStorage and is invalidated when the account changes.
 */
export function useWalletSession(): WalletSessionState {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const previousAddress = useRef<string | undefined>(undefined);
  const [accountChanged, setAccountChanged] = useState(false);

  useEffect(() => {
    const previous = previousAddress.current;
    if (previous && address && previous.toLowerCase() !== address.toLowerCase()) {
      setAccountChanged(true);
    }
    if (!address) setAccountChanged(false);
    previousAddress.current = address;
  }, [address]);

  return {
    address,
    chainId,
    isConnected,
    isCorrectNetwork: chainId === 1,
    accountChanged,
    disconnect: () => disconnect(),
  };
}
