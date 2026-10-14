# StakeLab Sepolia registry

This repository is an independent demo and is not affiliated with Lido. The registry feature is **Sepolia testnet only**; it is not a staking product and must not be used to collect real funds.

## Deploy

1. Open Remix or another Solidity IDE and compile `contracts/StakeLabRegistry.sol` with Solidity 0.8.24 or newer.
2. Connect a wallet to **Sepolia (chain ID 11155111)** and deploy the contract there.
3. Copy the deployed contract address into the hosting environment variable `VITE_STAKELAB_REGISTRY_ADDRESS`.
4. Redeploy the frontend. Until this variable contains a valid contract address, the registration action remains disabled.
5. Use Sepolia test ETH only. The contract records the caller address and registration timestamp; it has no payable methods and no token approval or transfer functions.

## Transaction behavior

The frontend calls only `register()` on the configured contract, with an explicit wallet confirmation. It checks the wallet chain, waits for the transaction receipt, and links the returned hash to Sepolia Etherscan. A broadcast hash is shown as pending until a successful receipt is returned.

Never point `VITE_STAKELAB_REGISTRY_ADDRESS` at a mainnet contract. Do not configure mainnet token approvals or a relayer as part of this demo.
