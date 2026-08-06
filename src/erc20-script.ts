import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "";
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || "";
const SPENDER_ADDRESS = process.env.SPENDER_ADDRESS || "";
const OWNER_ADDRESS = process.env.OWNER_ADDRESS || "0xEfc5859335A58d64A5e8E01d02c5241c852CBD40";

const erc20Abi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)"
];

async function main() {
  if (!RPC_URL || !PRIVATE_KEY || !TOKEN_ADDRESS || !RECIPIENT_ADDRESS || !SPENDER_ADDRESS || !OWNER_ADDRESS) {
    throw new Error("Missing required environment variables (RPC_URL, PRIVATE_KEY, TOKEN_ADDRESS, RECIPIENT_ADDRESS, SPENDER_ADDRESS, OWNER_ADDRESS)");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const token = new ethers.Contract(TOKEN_ADDRESS, erc20Abi, wallet);

  const [name, symbol, decimals, totalSupply, walletBalance, ownerBalance] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
    token.balanceOf(wallet.address),
    token.balanceOf(OWNER_ADDRESS),
  ]);

  console.log("Token:", name, `(${symbol})`);
  console.log("Decimals:", decimals.toString());
  console.log("Total Supply:", ethers.formatUnits(totalSupply, decimals));
  console.log("Wallet:", wallet.address);
  console.log("Wallet Balance:", ethers.formatUnits(walletBalance, decimals));
  console.log("Owner Balance:", ethers.formatUnits(ownerBalance, decimals));

  const transferAmount = ethers.parseUnits("10", decimals);
  const transferTx = await token.transfer(RECIPIENT_ADDRESS, transferAmount);
  console.log("Transfer tx:", transferTx.hash);
  await transferTx.wait();

  const approveAmount = ethers.parseUnits("25", decimals);
  const approveTx = await token.approve(SPENDER_ADDRESS, approveAmount);
  console.log("Approve tx:", approveTx.hash);
  await approveTx.wait();

  const allowance = await token.allowance(wallet.address, SPENDER_ADDRESS);
  console.log("Allowance:", ethers.formatUnits(allowance, decimals));

  const transferFromAmount = ethers.parseUnits("5", decimals);
  const transferFromTx = await token.transferFrom(OWNER_ADDRESS, RECIPIENT_ADDRESS, transferFromAmount);
  console.log("transferFrom tx:", transferFromTx.hash);
  await transferFromTx.wait();
}

if (process.argv[1]?.includes("erc20-script")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { main as runErc20Script };
