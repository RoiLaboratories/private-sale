const { ethers, run } = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

// Function to generate ABI files
async function generateAbi() {
  // Path to the script
  const generateAbiPath = path.join(__dirname, 'generate-abi.js');
  
  // Check if the script exists
  if (!fs.existsSync(generateAbiPath)) {
    console.error('ABI generation script not found.');
    return;
  }

  console.log("\nGenerating ABI files...");
  
  try {
    // Execute the script
    require('./generate-abi.js');
  } catch (error) {
    console.error("Error generating ABI:", error);
  }
}

async function main() {
  // Get parameters from environment variables
  const USDC_ADDRESS = process.env.USDC_ADDRESS;
  const ROI_ADDRESS = process.env.ROI_ADDRESS;
  // For 1 USDC (6 decimals), we need to give 1250 ROI (18 decimals)
  // So we need to multiply by 10^12 to account for the decimal difference
  const ROI_PER_USDC = ethers.parseUnits("1250", 12); // 1 USDC = 1250 ROI at $0.0008 per ROI
  
  // Convert 5000 USDC to wei (6 decimals for USDC)
  const SOFT_CAP = ethers.parseUnits("5000", 6);
  
  // Convert 10000 USDC to wei (6 decimals for USDC)
  const HARD_CAP = ethers.parseUnits("10000", 6);

  console.log("Deploying RoiTokenSale contract...");
  console.log(`USDC Address: ${USDC_ADDRESS}`);
  console.log(`ROI Address: ${ROI_ADDRESS}`);
  console.log(`ROI per USDC: ${ROI_PER_USDC}`);
  console.log(`Soft Cap: ${SOFT_CAP} (5,000 USDC)`);
  console.log(`Hard Cap: ${HARD_CAP} (10,000 USDC)`);

  // Deploy the contract
  const RoiTokenSale = await ethers.getContractFactory("RoiTokenSale");
  const roiTokenSale = await RoiTokenSale.deploy(
    USDC_ADDRESS,
    ROI_ADDRESS,
    ROI_PER_USDC,
    SOFT_CAP,
    HARD_CAP
  );

  await roiTokenSale.waitForDeployment();

  const contractAddress = await roiTokenSale.getAddress();
  console.log(`RoiTokenSale deployed to: ${contractAddress}`);
  
  // Generate ABI files
  await generateAbi();
  
  // Add a reminder to update the .env file
  console.log("\nDon't forget to update your .env file with the new contract address:");
  console.log(`SALE_CONTRACT_ADDRESS=${contractAddress}`);

  // Wait for a few block confirmations before verification
  console.log("\nWaiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds delay
  
  // Verify the contract on BaseScan
  console.log("\nVerifying contract on BaseScan...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [
        USDC_ADDRESS,
        ROI_ADDRESS,
        ROI_PER_USDC,
        SOFT_CAP,
        HARD_CAP
      ],
    });
    console.log("Contract verification successful!");
  } catch (error) {
    console.error("Error verifying contract:", error);
    console.log("\nIf verification failed, you can manually verify with this command:");
    console.log(`npx hardhat verify --network base ${contractAddress} ${USDC_ADDRESS} ${ROI_ADDRESS} ${ROI_PER_USDC} ${SOFT_CAP} ${HARD_CAP}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
