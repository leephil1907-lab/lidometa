import {
  getAddress,
  parseEther,
  zeroAddress,
  type Address,
  type PublicClient,
  type WalletClient,
} from 'viem';

export const ETHEREUM_MAINNET_CHAIN_ID = 1;
export const OFFICIAL_LIDO_STETH_ADDRESS = getAddress(
  '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
);

const stEthAbi = [
  {
    type: 'function',
    name: 'submit',
    stateMutability: 'payable',
    inputs: [{ name: '_referral', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export type LidoTransactionResult = {
  hash: `0x${string}`;
  blockNumber: bigint;
  gasUsed: bigint;
  status: 'success';
  explorerUrl: string;
};

/**
 * Sends a genuine ETH -> stETH deposit to Lido's mainnet stETH contract.
 * The wallet prompts for the transaction; this function never requests a
 * message signature, token approval, Permit2 authorization, or private key.
 */
export async function stakeEthWithLido(params: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: Address;
  amountEth: string;
  onSubmitted?: (hash: `0x${string}`) => void;
  onConfirming?: (hash: `0x${string}`) => void;
}): Promise<LidoTransactionResult> {
  const { publicClient, walletClient, account, amountEth, onSubmitted, onConfirming } = params;

  if (publicClient.chain?.id !== ETHEREUM_MAINNET_CHAIN_ID ||
      walletClient.chain?.id !== ETHEREUM_MAINNET_CHAIN_ID) {
    throw new Error('Switch your wallet to Ethereum Mainnet before staking.');
  }

  const connected = walletClient.account?.address;
  if (!connected || getAddress(connected) !== getAddress(account)) {
    throw new Error('The connected wallet account changed. Reconnect and try again.');
  }

  if (!amountEth.trim() || !/^(?:\d+)(?:\.\d{1,18})?$/.test(amountEth.trim())) {
    throw new Error('Enter a valid ETH amount with no more than 18 decimal places.');
  }

  const value = parseEther(amountEth.trim());
  if (value <= 0n) throw new Error('The staking amount must be greater than zero.');

  const balance = await publicClient.getBalance({ address: account });
  const gasPrice = await publicClient.getGasPrice();
  const { request } = await publicClient.simulateContract({
    account,
    address: OFFICIAL_LIDO_STETH_ADDRESS,
    abi: stEthAbi,
    functionName: 'submit',
    args: [zeroAddress],
    value,
  });

  const estimatedGas = await publicClient.estimateContractGas({
    account,
    address: OFFICIAL_LIDO_STETH_ADDRESS,
    abi: stEthAbi,
    functionName: 'submit',
    args: [zeroAddress],
    value,
  });
  const reserve = estimatedGas * gasPrice;
  if (balance < value + reserve) {
    throw new Error('Insufficient ETH to cover the stake amount and estimated network fee.');
  }

  // Re-check chain/account immediately before opening the wallet confirmation.
  if (walletClient.chain?.id !== ETHEREUM_MAINNET_CHAIN_ID ||
      getAddress(walletClient.account?.address ?? zeroAddress) !== getAddress(account)) {
    throw new Error('Wallet network or account changed. Please retry.');
  }

  const hash = await walletClient.writeContract(request);
  onSubmitted?.(hash);
  onConfirming?.(hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') {
    throw new Error(`The transaction failed on-chain. Check transaction ${hash} on Etherscan.`);
  }

  return {
    hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
    status: 'success',
    explorerUrl: `https://etherscan.io/tx/${hash}`,
  };
}
