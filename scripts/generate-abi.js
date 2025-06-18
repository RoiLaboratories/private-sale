const fs = require('fs');
const path = require('path');

// This script extracts the ABI from the compiled contract artifacts
// and saves it to the abi folder for use in the frontend

async function main() {
  // Create abi directory if it doesn't exist
  const abiDir = path.join(__dirname, '..', 'abi');
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  // Create frontend/abi directory if it doesn't exist
  const frontendAbiDir = path.join(__dirname, '..', 'frontend', 'abi');
  if (!fs.existsSync(frontendAbiDir)) {
    fs.mkdirSync(frontendAbiDir, { recursive: true });
  }

  // Path to the compiled contract artifact
  const contractArtifactPath = path.join(
    __dirname, 
    '..', 
    'artifacts', 
    'contracts', 
    'RoiTokenSale.sol', 
    'RoiTokenSale.json'
  );

  // Check if the artifact exists
  if (!fs.existsSync(contractArtifactPath)) {
    console.error('Contract artifact not found. Please compile the contract first with: npx hardhat compile');
    process.exit(1);
  }

  // Read the artifact JSON
  const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));
  
  // Extract the ABI
  const abi = contractArtifact.abi;
  
  // Create the ABI file content
  const abiFileContent = JSON.stringify({ abi }, null, 2);
  
  // Write to the abi folder
  fs.writeFileSync(path.join(abiDir, 'Launchpad.json'), abiFileContent);
  console.log('ABI file created at: ' + path.join(abiDir, 'Launchpad.json'));
  
  // Also write to the frontend/abi folder
  fs.writeFileSync(path.join(frontendAbiDir, 'Launchpad.json'), abiFileContent);
  console.log('ABI file created at: ' + path.join(frontendAbiDir, 'Launchpad.json'));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
