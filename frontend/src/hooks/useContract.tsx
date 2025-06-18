import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
import LaunchpadABI from '../../abi/Launchpad.json';

// Type definitions
export interface ContractState {
  softCap: bigint;
  hardCap: bigint;
  totalRaised: bigint;
  roiPerUSDC: bigint;
  isSoftCapReached: boolean;
  isHardCapReached: boolean;
  remainingToHardCap: bigint;
}

export interface TokenBalances {
  usdc: bigint;
  roi: bigint;
}

// Constants from environment variables
const SALE_CONTRACT_ADDRESS = import.meta.env.VITE_SALE_CONTRACT_ADDRESS;
const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS;
const ROI_ADDRESS = import.meta.env.VITE_ROI_ADDRESS;
const BASE_RPC_URL = import.meta.env.VITE_BASE_RPC_URL;

// Default ERC20 ABI for basic functions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export const useContract = () => {
  const { user, authenticated, ready } = usePrivy();
  const [saleContract, setSaleContract] = useState<ethers.Contract | null>(null);
  const [usdcContract, setUsdcContract] = useState<ethers.Contract | null>(null);
  const [roiContract, setRoiContract] = useState<ethers.Contract | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [balances, setBalances] = useState<TokenBalances>({ usdc: BigInt(0), roi: BigInt(0) });
  const [contractState, setContractState] = useState<ContractState>({
    softCap: BigInt(0),
    hardCap: BigInt(0),
    totalRaised: BigInt(0),
    roiPerUSDC: BigInt(0),
    isSoftCapReached: false,
    isHardCapReached: false,
    remainingToHardCap: BigInt(0),
  });
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));

  // Fetch contract state (works with read-only provider)
  const getContractState = useCallback(async (contract: ethers.Contract) => {
    if (!contract) return;
    
    try {
      console.log('Fetching contract state...');
      const [softCap, hardCap, totalRaised, roiPerUSDC] = await Promise.all([
        contract.softCap(),
        contract.hardCap(),
        contract.totalRaised(),
        contract.roiPerUSDC(),
      ]);

      const newState: ContractState = {
        softCap: BigInt(softCap),
        hardCap: BigInt(hardCap),
        totalRaised: BigInt(totalRaised),
        roiPerUSDC: BigInt(roiPerUSDC),
        isSoftCapReached: BigInt(totalRaised) >= BigInt(softCap),
        isHardCapReached: BigInt(totalRaised) >= BigInt(hardCap),
        remainingToHardCap: BigInt(hardCap) - BigInt(totalRaised)
      };

      console.log('Contract state:', {
        softCap: softCap.toString(),
        hardCap: hardCap.toString(),
        totalRaised: totalRaised.toString(),
        roiPerUSDC: roiPerUSDC.toString()
      });

      setContractState(newState);
    } catch (error) {
      console.error('Error fetching contract state:', error);
    }
  }, []);

  // Initialize contracts
  useEffect(() => {
    const initContracts = async () => {
      try {
        setIsLoading(true);
        console.log('Initializing contracts...', { authenticated, ready });        // Create read-only provider first
        const readProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);
        let signer = null;
        let activeProvider: ethers.Provider = readProvider;

        // If authenticated, switch to wallet provider
        if (authenticated && user?.wallet?.address) {
          const ethereum = (window as any).ethereum;
          if (ethereum) {
            const browserProvider = new ethers.BrowserProvider(ethereum);
            signer = await browserProvider.getSigner();
            activeProvider = browserProvider;
            console.log('Got signer:', await signer.getAddress());
          }
        }        // Create contracts
        const sale = new ethers.Contract(SALE_CONTRACT_ADDRESS, LaunchpadABI.abi, signer || activeProvider);
        const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer || activeProvider);
        const roi = new ethers.Contract(ROI_ADDRESS, ERC20_ABI, signer || activeProvider);

        // Set contracts
        setSaleContract(sale);
        setUsdcContract(usdc);
        setRoiContract(roi);

        // Always fetch contract state
        await getContractState(sale);

        // If authenticated, get balances and check ownership
        if (authenticated && user?.wallet?.address) {
          setAddress(user.wallet.address);
          const owner = await sale.owner();
          setIsOwner(owner.toLowerCase() === user.wallet.address.toLowerCase());
          
          if (usdc && roi) {
            const [usdcBalance, roiBalance] = await Promise.all([
              usdc.balanceOf(user.wallet.address),
              roi.balanceOf(user.wallet.address)
            ]);
            
            setBalances({
              usdc: BigInt(usdcBalance.toString()),
              roi: BigInt(roiBalance.toString())
            });

            // Get USDC allowance
            const currentAllowance = await usdc.allowance(user.wallet.address, SALE_CONTRACT_ADDRESS);
            setAllowance(BigInt(currentAllowance.toString()));
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing contracts:', error);
        setIsLoading(false);
      }
    };

    if (ready) {
      initContracts();
    }
  }, [ready, authenticated, user?.wallet?.address, getContractState]);

  // Refresh data manually
  const refreshData = useCallback(async () => {
    if (!saleContract) return;

    try {
      await getContractState(saleContract);

      if (authenticated && user?.wallet?.address && usdcContract && roiContract) {
        const [usdcBalance, roiBalance, allowance] = await Promise.all([
          usdcContract.balanceOf(user.wallet.address),
          roiContract.balanceOf(user.wallet.address),
          usdcContract.allowance(user.wallet.address, SALE_CONTRACT_ADDRESS)
        ]);

        setBalances({
          usdc: BigInt(usdcBalance.toString()),
          roi: BigInt(roiBalance.toString())
        });
        setAllowance(BigInt(allowance.toString()));
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [saleContract, usdcContract, roiContract, authenticated, user?.wallet?.address]);

  // Approve USDC spending
  const approveUSDC = async (amount: bigint) => {
    if (!usdcContract || !authenticated) throw new Error('Contract or authentication not ready');
    const tx = await usdcContract.approve(SALE_CONTRACT_ADDRESS, amount);
    await tx.wait();
  };

  // Buy ROI tokens
  const buyTokens = async (usdcAmount: bigint) => {
    if (!saleContract || !authenticated) throw new Error('Contract or authentication not ready');
    const tx = await saleContract.buy(usdcAmount);
    await tx.wait();
  };

  // Withdraw USDC (owner only)
  const withdrawUSDC = async (amount: bigint) => {
    if (!saleContract || !authenticated || !isOwner) throw new Error('Not authorized');
    const tx = await saleContract.withdrawUSDC(amount);
    await tx.wait();
  };

  // Withdraw ROI (owner only)
  const withdrawROI = async (amount: bigint) => {
    if (!saleContract || !authenticated || !isOwner) throw new Error('Not authorized');
    const tx = await saleContract.withdrawROI(amount);
    await tx.wait();
  };

  // Set up periodic refresh
  useEffect(() => {
    if (!saleContract) return;

    const refreshData = async () => {
      try {
        // Always refresh contract state
        await getContractState(saleContract);

        // Refresh user-specific data if authenticated
        if (authenticated && user?.wallet?.address && usdcContract && roiContract) {
          const [usdcBalance, roiBalance, allowance] = await Promise.all([
            usdcContract.balanceOf(user.wallet.address),
            roiContract.balanceOf(user.wallet.address),
            usdcContract.allowance(user.wallet.address, SALE_CONTRACT_ADDRESS)
          ]);

          setBalances({
            usdc: BigInt(usdcBalance.toString()),
            roi: BigInt(roiBalance.toString())
          });
          setAllowance(BigInt(allowance.toString()));
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    };

    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [saleContract, usdcContract, roiContract, authenticated, user?.wallet?.address, getContractState]);

  // Debug logging for authentication state
  useEffect(() => {
    console.log('Auth state:', {
      ready,
      authenticated,
      address,
      hasWallet: !!user?.wallet
    });
  }, [ready, authenticated, address, user?.wallet]);

  // Debug logging for contract initialization
  useEffect(() => {
    console.log('Contract Initialization:', {
      isWalletConnected: !!user?.wallet,
      contracts: {
        hasUSDC: !!usdcContract,
        hasROI: !!roiContract,
        USDC_ADDRESS,
        ROI_ADDRESS
      }
    });
  }, [user?.wallet, usdcContract, roiContract]);

  // Debug logging for contract state and balances
  useEffect(() => {
    console.log('Contract State:', {
      softCap: contractState.softCap.toString(),
      hardCap: contractState.hardCap.toString(),
      totalRaised: contractState.totalRaised.toString(),
      roiPerUSDC: contractState.roiPerUSDC.toString()
    });
    console.log('Balances:', {
      usdc: balances.usdc.toString(),
      roi: balances.roi.toString()
    });
  }, [contractState, balances]);

  // Debug logging for balances updates
  useEffect(() => {
    console.log('Current Balances:', {
      usdc: balances.usdc.toString(),
      roi: balances.roi.toString(),
      address: user?.wallet?.address
    });
  }, [balances, user?.wallet?.address]);

  return {
    address,
    isOwner,
    isLoading,
    balances,
    contractState,
    allowance,
    refreshData,
    approveUSDC,
    buyTokens,
    withdrawUSDC,
    withdrawROI,
  };
};
