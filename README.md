# ROI Token Sale DApp

A private token sale DApp on the Base network using Solidity and React (Vite). This DApp allows users to buy ROI tokens using USDC on the Base chain.

## Project Structure

- `contracts/`: Smart contract code
  - `RoiTokenSale.sol`: Main token sale contract
  - `MockERC20.sol`: ERC20 token for testing
- `scripts/`: Deployment and utility scripts
- `test/`: Contract tests
- `frontend/`: React frontend application
- `abi/`: Contract ABIs (generated after compilation)

## Getting Started

### Prerequisites

- Node.js and npm
- MetaMask or another Ethereum wallet
- A Privy account for authentication integration

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
cd frontend
npm install
```

3. Configure your environment variables:
   - Copy `.env.example` to `.env` and fill in your values
   - Copy `frontend/.env.example` to `frontend/.env` and fill in your values

## Smart Contract Development

### Compiling Contracts

```bash
npm run compile
```

### Generating ABI

After compiling, generate the ABI files:

```bash
npm run generate-abi
```

This will create ABI files in both the `abi/` directory and the `frontend/abi/` directory.

### Testing Contracts

```bash
npm test
```

### Deploying Contracts

To deploy to Base mainnet:

```bash
npm run deploy:base
```

To deploy to a local Hardhat network for testing:

```bash
npm run deploy:local
```

### Verifying Contracts

The deployment script will automatically attempt to verify the contract on BaseScan. If it fails, you can verify manually:

```bash
npm run verify -- --network base CONTRACT_ADDRESS USDC_ADDRESS ROI_ADDRESS ROI_PER_USDC SOFT_CAP HARD_CAP
```

## Frontend Development

### Starting the Development Server

```bash
cd frontend
npm run dev
```

### Building for Production

```bash
cd frontend
npm run build
```

## Features

- Token sale with fixed price (1 ROI = $0.0008)
- Soft cap (5,000 USDC) and hard cap (10,000 USDC)
- Real-time display of equivalent ROI tokens
- Mobile responsive design
- Wallet connection via Privy
- Owner-only withdrawal functions

## License

[ISC License](LICENSE)
