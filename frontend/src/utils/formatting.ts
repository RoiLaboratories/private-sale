import { ethers } from "ethers";

// Format numbers with commas
export const formatNumber = (num: number | string | bigint): string => {
  return new Intl.NumberFormat().format(Number(num));
};

// Format USDC amount (6 decimals)
export const formatUSDC = (amount: bigint): string => {
  return ethers.formatUnits(amount, 6);
};

// Format ROI amount (18 decimals)
export const formatROI = (amount: bigint): string => {
  // Convert from wei (18 decimals) to actual ROI amount
  const formatted = ethers.formatUnits(amount, 18);
  
  // Format with commas and no decimals
  return formatNumber(Number(formatted));
};

// Parse USDC input to bigint (6 decimals)
export const parseUSDC = (amount: string): bigint => {
  return ethers.parseUnits(amount || "0", 6);
};

// Parse ROI input to bigint (18 decimals)
export const parseROI = (amount: string): bigint => {
  return ethers.parseUnits(amount || "0", 18);
};

// Truncate address for display
export const truncateAddress = (address: string, start = 6, end = 4): string => {
  if (!address) return "";
  if (address.length <= start + end) return address;
  return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
};

// Calculate ROI tokens from USDC amount (1 ROI = $0.0008 USDC)
export const calculateROIFromUSDC = (usdcAmount: string): string => {
  try {
    if (!usdcAmount || isNaN(Number(usdcAmount))) return "0";
    
    // Convert USDC input to amount with 6 decimals
    const usdcInWei = parseUSDC(usdcAmount);
    
    // Since 1 ROI = $0.0008 USDC
    // For 1 USDC, you get 1/0.0008 = 1250 ROI tokens
    // But we need to account for 18 decimals of ROI token
    const roiAmount = (usdcInWei * BigInt(1250)) / BigInt(10 ** 6);
    
    // Return the exact amount that will appear in MetaMask (18 decimals)
    return ethers.formatUnits(roiAmount, 18);
  } catch (error) {
    console.error("Error calculating ROI from USDC:", error);
    return "0";
  }
};
