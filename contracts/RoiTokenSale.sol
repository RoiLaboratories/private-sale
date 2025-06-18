// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RoiTokenSale
 * @dev Contract for a private sale of ROI tokens using USDC on Base network
 */
contract RoiTokenSale is Ownable {
    using SafeERC20 for IERC20;

    // Token addresses
    address public usdcToken;
    address public roiToken;

    // Sale parameters
    uint256 public roiPerUSDC; // How many ROI tokens per 1 USDC
    uint256 public softCap;    // Minimum USDC to raise (in wei)
    uint256 public hardCap;    // Maximum USDC to raise (in wei)
    uint256 public totalRaised; // Total USDC raised (in wei)

    // Events
    event TokensPurchased(address indexed buyer, uint256 usdcAmount, uint256 roiAmount);
    event USDCWithdrawn(uint256 amount);
    event ROIWithdrawn(uint256 amount);

    /**
     * @dev Constructor
     * @param _usdcToken USDC token address
     * @param _roiToken ROI token address
     * @param _roiPerUSDC Rate of ROI tokens per 1 USDC
     * @param _softCap Soft cap for the sale in USDC (in wei)
     * @param _hardCap Hard cap for the sale in USDC (in wei)
     */
    constructor(
        address _usdcToken,
        address _roiToken,
        uint256 _roiPerUSDC,
        uint256 _softCap,
        uint256 _hardCap
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "USDC token address cannot be zero");
        require(_roiToken != address(0), "ROI token address cannot be zero");
        require(_roiPerUSDC > 0, "ROI per USDC must be greater than zero");
        require(_softCap > 0, "Soft cap must be greater than zero");
        require(_hardCap > _softCap, "Hard cap must be greater than soft cap");

        usdcToken = _usdcToken;
        roiToken = _roiToken;
        roiPerUSDC = _roiPerUSDC;
        softCap = _softCap;
        hardCap = _hardCap;
    }

    /**
     * @dev Buy ROI tokens with USDC
     * @param usdcAmount Amount of USDC to spend (in wei)
     */
    function buy(uint256 usdcAmount) external {
        require(usdcAmount > 0, "Amount must be greater than zero");
        require(totalRaised + usdcAmount <= hardCap, "Purchase exceeds hard cap");

        // Calculate ROI tokens to be received
        uint256 roiAmount = usdcAmount * roiPerUSDC;

        // Check if the contract has enough ROI tokens
        require(IERC20(roiToken).balanceOf(address(this)) >= roiAmount, "Not enough ROI tokens in contract");

        // Transfer USDC from user to contract
        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Update total raised
        totalRaised += usdcAmount;

        // Transfer ROI tokens to user
        IERC20(roiToken).safeTransfer(msg.sender, roiAmount);

        // Emit event
        emit TokensPurchased(msg.sender, usdcAmount, roiAmount);
    }

    /**
     * @dev Check if soft cap has been reached
     * @return bool True if soft cap has been reached
     */
    function isSoftCapReached() public view returns (bool) {
        return totalRaised >= softCap;
    }

    /**
     * @dev Check if hard cap has been reached
     * @return bool True if hard cap has been reached
     */
    function isHardCapReached() public view returns (bool) {
        return totalRaised >= hardCap;
    }

    /**
     * @dev Get remaining amount to reach hard cap
     * @return uint256 Remaining amount to reach hard cap (in wei)
     */
    function remainingToHardCap() public view returns (uint256) {
        if (totalRaised >= hardCap) {
            return 0;
        }
        return hardCap - totalRaised;
    }

    /**
     * @dev Withdraw USDC from contract (only owner)
     * @param amount Amount of USDC to withdraw (in wei)
     */
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        require(IERC20(usdcToken).balanceOf(address(this)) >= amount, "Not enough USDC in contract");
        
        // Transfer USDC to owner
        IERC20(usdcToken).safeTransfer(owner(), amount);

        // Emit event
        emit USDCWithdrawn(amount);
    }

    /**
     * @dev Withdraw unsold ROI tokens from contract (only owner)
     * @param amount Amount of ROI tokens to withdraw
     */
    function withdrawROI(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        require(IERC20(roiToken).balanceOf(address(this)) >= amount, "Not enough ROI tokens in contract");
        
        // Transfer ROI tokens to owner
        IERC20(roiToken).safeTransfer(owner(), amount);

        // Emit event
        emit ROIWithdrawn(amount);
    }
}
