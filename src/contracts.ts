export const LIDO_ADDRESSES = {
  stETH: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  wstETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
  withdrawalQueue: "0x88934B0232C23B393AE598ae9b32d69e82bE5306",
  lidoLocator: "0xC1d0b3DE6792B201026602330a112f4E91361D67",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};

// Complete ABI for stETH (Lido Core Contract)
export const STETH_ABI = [
  "function submit(address _referral) payable returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function getPooledEthByShares(uint256 _sharesAmount) view returns (uint256)",
  "function getSharesByPooledEth(uint256 _pooledEthAmount) view returns (uint256)",
  "function sharesOf(address _account) view returns (uint256)",
  "function getTotalShares() view returns (uint256)",
  "function getTotalPooledEther() view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function nonces(address owner) view returns (uint256)",
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "event Submitted(address indexed sender, uint256 amount, address referral)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// Complete ABI for wstETH (Wrapped stETH)
export const WSTETH_ABI = [
  "function wrap(uint256 _stETHAmount) returns (uint256)",
  "function unwrap(uint256 _wstETHAmount) returns (uint256)",
  "function stETHPerToken() view returns (uint256)",
  "function tokensPerStETH() view returns (uint256)",
  "function getWstETHByStETH(uint256 _stETHAmount) view returns (uint256)",
  "function getStETHByWstETH(uint256 _wstETHAmount) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

// ABI for Lido Withdrawal Queue NFT Contract
export const WITHDRAWAL_QUEUE_ABI = [
  "function requestWithdrawals(uint256[] _amounts, address _owner) returns (uint256[] requestIds)",
  "function requestWithdrawalsWstETH(uint256[] _amounts, address _owner) returns (uint256[] requestIds)",
  "function claimWithdrawal(uint256 _requestId)",
  "function claimWithdrawals(uint256[] _requestIds, uint256[] _hints)",
  "function getWithdrawalRequests(address _owner) view returns (uint256[] requestIds)",
  "function getWithdrawalStatus(uint256[] _requestIds) view returns (tuple(uint256 amountOfStETH, uint256 amountOfShares, address owner, uint256 timestamp, bool isFinalized, bool isClaimed)[])",
  "function getLastFinalizedRequestId() view returns (uint256)",
  "function findCheckpointHints(uint256[] _requestIds, uint256 _firstIndex, uint256 _lastIndex) view returns (uint256[] hints)"
];

// ABI for Lido Locator Contract
export const LIDO_LOCATOR_ABI = [
  "function stETH() view returns (address)",
  "function wstETH() view returns (address)",
  "function withdrawalQueue() view returns (address)",
  "function depositSecurityModule() view returns (address)",
  "function oracleReportSanityChecker() view returns (address)"
];

// Minimal ABI for Permit2 Pull contract
export const PERMIT2_PULL_ABI = [
  "function permitAndPull(address token, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature) external returns (uint256 netAmount, uint256 feeAmount)",
];

