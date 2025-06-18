import { useState, useEffect } from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import Button from './components/Button';
import Input from './components/Input';
import ProgressBar from './components/ProgressBar';
import Notification from './components/Notification';
import { useContract } from './hooks/useContract';
import { useNotification } from './hooks/useNotification';
import { 
  formatUSDC,
  formatROI,
  parseUSDC,
  calculateROIFromUSDC,
  formatNumber,
} from './utils/formatting';
import './App.css';

// Get environment variables
const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

const truncateAddress = (address?: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Main App component wrapper with Privy provider
function App() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['wallet', 'email'],
        appearance: {
          theme: 'dark',
          accentColor: '#f97316',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets'
        },
      }}
    >
      <TokenSale />
    </PrivyProvider>
  );
}

// Token Sale Component
function TokenSale() {
  const { login, authenticated, ready, logout, user } = usePrivy();
  const [usdcAmount, setUsdcAmount] = useState<string>('');
  const [roiAmount, setRoiAmount] = useState<string>('0');
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isBuying, setIsBuying] = useState<boolean>(false);
  
  const { 
    isLoading,
    balances,
    contractState,
    allowance,
    refreshData,
    approveUSDC,
    buyTokens
  } = useContract();

  const {
    notification,
    hideNotification,
    showSuccess,
    showError
  } = useNotification();

  // Update ROI amount when USDC amount changes
  useEffect(() => {
    if (usdcAmount) {
      setRoiAmount(calculateROIFromUSDC(usdcAmount));
    } else {
      setRoiAmount('0');
    }
  }, [usdcAmount]);

  // Handle USDC input change
  const handleUsdcAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setUsdcAmount(value);
    }
  };

  // Handle approval button click
  const handleApprove = async () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    try {
      setIsApproving(true);
      const parsedAmount = parseUSDC(usdcAmount);
      await approveUSDC(parsedAmount);
      showSuccess('USDC approved successfully');
      await refreshData();
    } catch (error) {
      console.error('Approval error:', error);
      showError('Failed to approve USDC');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle buy button click
  const handleBuy = async () => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    try {
      setIsBuying(true);
      const parsedAmount = parseUSDC(usdcAmount);
      await buyTokens(parsedAmount);
      showSuccess('ROI tokens purchased successfully');
      await refreshData();
      setUsdcAmount('');
      setRoiAmount('0');
    } catch (error) {
      console.error('Purchase error:', error);
      showError('Failed to purchase ROI tokens');
    } finally {
      setIsBuying(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8 px-4">
      <div className="container mx-auto max-w-xl">
        {/* Header section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">ROI Token Sale</h1>
          <div className="flex justify-center gap-4 items-center">
            {authenticated ? (
              <>
                <p className="text-gray-300">{user?.wallet?.address ? truncateAddress(user.wallet.address) : ''}</p>
                <Button onClick={logout} className="!bg-gray-700 hover:!bg-gray-600">
                  Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={login}>Connect Wallet</Button>
            )}
          </div>
        </div>

        {/* Sale progress */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Sale Progress</p>
            <ProgressBar
              current={Number(contractState.totalRaised)}
              total={Number(contractState.hardCap)}
              softCap={Number(contractState.softCap)}
              label={`${formatUSDC(contractState.totalRaised)} / ${formatUSDC(contractState.hardCap)} USDC`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Soft Cap</p>
              <p className="font-medium">{formatUSDC(contractState.softCap)} USDC</p>
            </div>
            <div>
              <p className="text-gray-400">Hard Cap</p>
              <p className="font-medium">{formatUSDC(contractState.hardCap)} USDC</p>
            </div>
            <div>
              <p className="text-gray-400">Total Raised</p>
              <p className="font-medium">{formatUSDC(contractState.totalRaised)} USDC</p>
            </div>
            <div>
              <p className="text-gray-400">Your ROI Balance</p>
              <p className="font-medium">{formatROI(balances.roi)} ROI</p>
            </div>
          </div>
        </div>

        {/* Purchase form */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="mb-6">
            <Input
              label="USDC Amount"
              value={usdcAmount}
              onChange={handleUsdcAmountChange}
              placeholder="0.00"
              disabled={!authenticated || isLoading}
            />
            <p className="text-sm text-gray-400 mt-2">
              MetaMask will show: {roiAmount} ROI
            </p>
            <p className="text-sm font-medium text-orange-400 mt-1">
              You will receive: {formatNumber(Number(usdcAmount || '0') * 1250)} ROI after the transaction
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Balance: {formatUSDC(balances.usdc)} USDC
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleApprove}
              disabled={
                !authenticated || 
                isLoading || 
                isApproving || 
                !usdcAmount ||
                allowance >= parseUSDC(usdcAmount)
              }
              isLoading={isApproving}
              className="flex-1"
            >
              Approve USDC
            </Button>
              
            <Button
              onClick={handleBuy}
              disabled={
                !authenticated || 
                isLoading || 
                isBuying || 
                !usdcAmount || 
                allowance < parseUSDC(usdcAmount) ||
                parseUSDC(usdcAmount) > contractState.remainingToHardCap
              }
              isLoading={isBuying}
              className="flex-1"
            >
              Buy ROI
            </Button>
          </div>
        </div>
      
        {/* Notification component */}
        <Notification
          type={notification.type}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      </div>
    </div>
  );
}

export default App;
