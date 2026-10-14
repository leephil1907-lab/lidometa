import { Contract, ZeroAddress, parseEther } from "ethers";

const LIDO_STETH_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
const LIDO_STETH_ABI = ["function submit(address _referral) payable returns (uint256)"];

/**
 * Submit ETH directly to Lido's canonical Ethereum mainnet staking contract.
 * The caller must pass a connected signer. The wallet will request explicit
 * transaction approval; no message-signature shortcut or synthetic hash is used.
 */
export const stakeETH = async (signer: any, amount: string): Promise<string> => {
  if (!signer) throw new Error("A connected wallet signer is required.");
  if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error("Enter a valid ETH amount greater than zero.");
  }
  const network = await signer.provider?.getNetwork?.();
  if (network && network.chainId !== 1n) {
    throw new Error("Switch your wallet to Ethereum Mainnet before staking.");
  }
  const contract = new Contract(LIDO_STETH_ADDRESS, LIDO_STETH_ABI, signer);
  const tx = await contract.submit(ZeroAddress, { value: parseEther(amount) });
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("The staking transaction did not confirm successfully.");
  return receipt.hash as string;
};
