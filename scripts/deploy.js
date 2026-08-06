const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Mainnet addresses - update for your network
  const LIDO = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";      // stETH
  const WSTETH = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";    // wstETH
  const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";   // Permit2
  const REFERRAL = "0xEfc5859335A58d64A5e8E01d02c5241c852CBD40";  // Your address
  const OWNER = "0xEfc5859335A58d64A5e8E01d02c5241c852CBD40";    // Owner address

  const UniswapXMiddleman = await hre.ethers.getContractFactory("UniswapXMiddleman");
  const contract = await UniswapXMiddleman.deploy(LIDO, WSTETH, PERMIT2, REFERRAL, OWNER);
  await contract.waitForDeployment();

  console.log("UniswapXMiddleman deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
