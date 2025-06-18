const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RoiTokenSale", function () {
  let RoiTokenSale;
  let roiTokenSale;
  let usdcToken;
  let roiToken;
  let owner;
  let buyer;
  
  // Constants
  const ROI_PER_USDC = 1250;
  const SOFT_CAP = ethers.parseUnits("5000", 6); // 5,000 USDC with 6 decimals
  const HARD_CAP = ethers.parseUnits("10000", 6); // 10,000 USDC with 6 decimals
  const INITIAL_ROI_SUPPLY = ethers.parseUnits("20000000", 18); // 20 million ROI tokens
  const INITIAL_USDC_SUPPLY = ethers.parseUnits("100000", 6); // 100,000 USDC

  beforeEach(async function () {
    // Get signers
    [owner, buyer] = await ethers.getSigners();
    
    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    usdcToken = await MockToken.deploy("USD Coin", "USDC", 6);
    roiToken = await MockToken.deploy("ROI Token", "ROI", 18);
    
    // Mint tokens
    await usdcToken.mint(buyer.address, INITIAL_USDC_SUPPLY);
    await roiToken.mint(owner.address, INITIAL_ROI_SUPPLY);
    
    // Deploy RoiTokenSale contract
    RoiTokenSale = await ethers.getContractFactory("RoiTokenSale");
    roiTokenSale = await RoiTokenSale.deploy(
      await usdcToken.getAddress(),
      await roiToken.getAddress(),
      ROI_PER_USDC,
      SOFT_CAP,
      HARD_CAP
    );
    
    // Transfer ROI tokens to the sale contract
    await roiToken.connect(owner).transfer(await roiTokenSale.getAddress(), INITIAL_ROI_SUPPLY);
  });

  describe("Initialization", function () {
    it("Should set the correct owner", async function () {
      expect(await roiTokenSale.owner()).to.equal(owner.address);
    });

    it("Should set the correct token addresses", async function () {
      expect(await roiTokenSale.usdcToken()).to.equal(await usdcToken.getAddress());
      expect(await roiTokenSale.roiToken()).to.equal(await roiToken.getAddress());
    });

    it("Should set the correct ROI per USDC rate", async function () {
      expect(await roiTokenSale.roiPerUSDC()).to.equal(ROI_PER_USDC);
    });

    it("Should set the correct soft cap and hard cap", async function () {
      expect(await roiTokenSale.softCap()).to.equal(SOFT_CAP);
      expect(await roiTokenSale.hardCap()).to.equal(HARD_CAP);
    });
  });

  describe("Token Purchase", function () {
    const purchaseAmount = ethers.parseUnits("1000", 6); // 1,000 USDC
    const expectedRoiAmount = purchaseAmount * BigInt(ROI_PER_USDC);

    beforeEach(async function () {
      // Approve USDC for sale contract
      await usdcToken.connect(buyer).approve(await roiTokenSale.getAddress(), purchaseAmount);
    });

    it("Should allow users to buy tokens", async function () {
      await expect(roiTokenSale.connect(buyer).buy(purchaseAmount))
        .to.emit(roiTokenSale, "TokensPurchased")
        .withArgs(buyer.address, purchaseAmount, expectedRoiAmount);

      // Check buyer received ROI tokens
      expect(await roiToken.balanceOf(buyer.address)).to.equal(expectedRoiAmount);
      
      // Check contract received USDC
      expect(await usdcToken.balanceOf(await roiTokenSale.getAddress())).to.equal(purchaseAmount);
      
      // Check total raised was updated
      expect(await roiTokenSale.totalRaised()).to.equal(purchaseAmount);
    });

    it("Should not allow purchase exceeding hard cap", async function () {
      const overCap = HARD_CAP + ethers.parseUnits("1", 6); // 10,001 USDC
      await usdcToken.connect(buyer).approve(await roiTokenSale.getAddress(), overCap);

      await expect(roiTokenSale.connect(buyer).buy(overCap))
        .to.be.revertedWith("Purchase exceeds hard cap");
    });
  });

  describe("Cap Checking", function () {
    it("Should correctly report if soft cap is reached", async function () {
      expect(await roiTokenSale.isSoftCapReached()).to.be.false;

      // Buy enough to reach soft cap
      await usdcToken.connect(buyer).approve(await roiTokenSale.getAddress(), SOFT_CAP);
      await roiTokenSale.connect(buyer).buy(SOFT_CAP);

      expect(await roiTokenSale.isSoftCapReached()).to.be.true;
    });

    it("Should correctly report if hard cap is reached", async function () {
      expect(await roiTokenSale.isHardCapReached()).to.be.false;

      // Buy enough to reach hard cap
      await usdcToken.connect(buyer).approve(await roiTokenSale.getAddress(), HARD_CAP);
      await roiTokenSale.connect(buyer).buy(HARD_CAP);

      expect(await roiTokenSale.isHardCapReached()).to.be.true;
    });

    it("Should correctly calculate remaining amount to hard cap", async function () {
      expect(await roiTokenSale.remainingToHardCap()).to.equal(HARD_CAP);

      // Buy half of hard cap
      const halfCap = HARD_CAP / BigInt(2);
      await usdcToken.connect(buyer).approve(await roiTokenSale.getAddress(), halfCap);
      await roiTokenSale.connect(buyer).buy(halfCap);

      expect(await roiTokenSale.remainingToHardCap()).to.equal(halfCap);

      // Buy remaining to reach hard cap
      await usdcToken.connect(buyer).approve(await roiTokenSale.getAddress(), halfCap);
      await roiTokenSale.connect(buyer).buy(halfCap);

      expect(await roiTokenSale.remainingToHardCap()).to.equal(0);
    });
  });

  describe("Token Withdrawal", function () {
    const purchaseAmount = ethers.parseUnits("1000", 6); // 1,000 USDC

    beforeEach(async function () {
      // Make a purchase
      await usdcToken.connect(buyer).approve(await roiTokenSale.getAddress(), purchaseAmount);
      await roiTokenSale.connect(buyer).buy(purchaseAmount);
    });

    it("Should allow owner to withdraw USDC", async function () {
      await expect(roiTokenSale.connect(owner).withdrawUSDC(purchaseAmount))
        .to.emit(roiTokenSale, "USDCWithdrawn")
        .withArgs(purchaseAmount);

      // Check owner received USDC
      expect(await usdcToken.balanceOf(owner.address)).to.equal(purchaseAmount);
      
      // Check contract has no USDC left
      expect(await usdcToken.balanceOf(await roiTokenSale.getAddress())).to.equal(0);
    });

    it("Should allow owner to withdraw ROI tokens", async function () {
      const remainingRoi = INITIAL_ROI_SUPPLY - (purchaseAmount * BigInt(ROI_PER_USDC));
      await expect(roiTokenSale.connect(owner).withdrawROI(remainingRoi))
        .to.emit(roiTokenSale, "ROIWithdrawn")
        .withArgs(remainingRoi);

      // Check owner received ROI tokens
      expect(await roiToken.balanceOf(owner.address)).to.equal(remainingRoi);
      
      // Check contract has no ROI tokens left (other than those already sold)
      expect(await roiToken.balanceOf(await roiTokenSale.getAddress())).to.equal(0);
    });

    it("Should not allow non-owner to withdraw tokens", async function () {
      await expect(roiTokenSale.connect(buyer).withdrawUSDC(purchaseAmount))
        .to.be.revertedWithCustomError(roiTokenSale, "OwnableUnauthorizedAccount");

      await expect(roiTokenSale.connect(buyer).withdrawROI(purchaseAmount))
        .to.be.revertedWithCustomError(roiTokenSale, "OwnableUnauthorizedAccount");
    });
  });
});
