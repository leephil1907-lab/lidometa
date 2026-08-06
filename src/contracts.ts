export const LIDO_ADDRESSES = {
  stETH: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  wstETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
};

// Minimal ABI for stETH (Lido)
export const STETH_ABI = [
  "function submit(address _referral) payable returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function getPooledEthByShares(uint256 _sharesAmount) view returns (uint256)",
  "function getSharesByPooledEth(uint256 _pooledEthAmount) view returns (uint256)",
  "event Submitted(address indexed sender, uint256 amount, address referral)",
];

// Minimal ABI for wstETH
export const WSTETH_ABI = [
  "function wrap(uint256 _stETHAmount) returns (uint256)",
  "function unwrap(uint256 _wstETHAmount) returns (uint256)",
  "function stETHPerToken() view returns (uint256)",
  "function tokensPerStETH() view returns (uint256)",
  "function getWstETHByStETH(uint256 _stETHAmount) view returns (uint256)",
  "function getStETHByWstETH(uint256 _wstETHAmount) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

// Minimal ABI for Permit2 Pull contract
export const PERMIT2_PULL_ABI = [
  "function permitAndPull(address token, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature) external returns (uint256 netAmount, uint256 feeAmount)",
];

