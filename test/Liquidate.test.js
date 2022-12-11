const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const helpers = require('@nomicfoundation/hardhat-network-helpers');

const { expect } = require('chai');
const { ethers } = require('hardhat');

const {
  DAI_WHALE,
  DAI_ADDR,
  cDAI_ADDR,
  LINK_WHALE,
  LINK_ADDR,
  cLINK_ADDR,
  ERC20_ABI,
  CTOKEN_ABI,
} = require('../constants');

const SUPPLY_DAI_AMOUNT = ethers.utils.parseEther('500');
const LINK_AMOUNT = ethers.utils.parseEther('100');

const tokenSupplyAddr = DAI_ADDR;
const cTokenSupplyAddr = cDAI_ADDR;
const tokenBorrowAddr = LINK_ADDR;
const cTokenBorrowAddr = cLINK_ADDR;

const fromWei = (value) =>
  ethers.utils.formatEther(
    typeof value === 'string' ? value : value.toString()
  );

describe('CompoundLiquidator', function () {
  async function deployCompoundFixture() {
    // Contracts are deployed using the first signer/account by default
    // const [borrower, liquidator] = await ethers.getSigners();

    // initialize CompoundBorrower contract
    const CompoundBorrower = await ethers.getContractFactory(
      'CompoundBorrower'
    );
    const compoundBorrower = await CompoundBorrower.deploy(
      tokenSupplyAddr,
      tokenBorrowAddr,
      cTokenSupplyAddr,
      cTokenBorrowAddr
    );

    // initialize CompoundLiquidator contract
    const CompoundLiquidator = await ethers.getContractFactory(
      'CompoundLiquidator'
    );
    const compoundLiquidator = await CompoundLiquidator.deploy(
      tokenBorrowAddr,
      cTokenBorrowAddr
    );

    // get token and cToken contracts
    const tokenSupply = await ethers.getContractAt(ERC20_ABI, tokenSupplyAddr);
    const cTokenSupply = await ethers.getContractAt(
      CTOKEN_ABI,
      cTokenSupplyAddr
    );
    const tokenBorrow = await ethers.getContractAt(ERC20_ABI, tokenBorrowAddr);
    const cTokenBorrow = await ethers.getContractAt(
      CTOKEN_ABI,
      cTokenBorrowAddr
    );

    const snapshot = async () => {
      let borrowerBalanceDai = await tokenSupply.balanceOf(
        compoundBorrower.address
      );
      borrowerBalanceDai = fromWei(borrowerBalanceDai);

      let borrowerBalanceLink = await tokenBorrow.balanceOf(
        compoundBorrower.address
      );
      borrowerBalanceLink = fromWei(borrowerBalanceLink);

      let { exchangeRate, supplyRatePerBlock } =
        await compoundBorrower.callStatic.getInfo();
      exchangeRate = fromWei(exchangeRate);
      supplyRatePerBlock = fromWei(supplyRatePerBlock);

      let balanceCTokenSupply = await compoundBorrower.getCTokenBalance();
      balanceCTokenSupply = fromWei(balanceCTokenSupply);

      let balanceOfUnderlying =
        await compoundBorrower.callStatic.getSupplyBalance();
      balanceOfUnderlying = fromWei(balanceOfUnderlying);

      let [liquidity, shortfall] = await compoundBorrower.getAccountLiquidity();
      let maxBorrow = await compoundBorrower.getMaxBorrow(liquidity);
      liquidity = fromWei(liquidity);
      shortfall = fromWei(shortfall);
      maxBorrow = fromWei(maxBorrow);

      let borrowedBalance =
        await compoundBorrower.callStatic.getBorrowBalance();
      borrowedBalance = fromWei(borrowedBalance);

      let liquidatorBalanceLink = await tokenBorrow.balanceOf(
        compoundLiquidator.address
      );
      liquidatorBalanceLink = fromWei(liquidatorBalanceLink);

      return {
        borrowerBalanceDai,
        exchangeRate,
        supplyRatePerBlock,
        balanceCTokenSupply,
        balanceOfUnderlying,
        liquidity,
        shortfall,
        maxBorrow,
        borrowedBalance,
        borrowerBalanceLink,
        liquidatorBalanceLink,
      };
    };

    // topup borrower with 500 DAI
    let tx;
    const daiImpersonatedSigner = await ethers.getImpersonatedSigner(DAI_WHALE);
    const daiContract = await ethers.getContractAt(ERC20_ABI, DAI_ADDR);
    tx = await daiContract
      .connect(daiImpersonatedSigner)
      .transfer(compoundBorrower.address, SUPPLY_DAI_AMOUNT);
    await tx.wait();

    // topup liquidator with 100 LINK
    const linkImpersonatedSigner = await ethers.getImpersonatedSigner(
      LINK_WHALE
    );
    const linkContract = await ethers.getContractAt(ERC20_ABI, LINK_ADDR);
    tx = await linkContract
      .connect(linkImpersonatedSigner)
      .transfer(compoundLiquidator.address, LINK_AMOUNT);
    await tx.wait();

    return {
      compoundBorrower,
      compoundLiquidator,
      snapshot,
    };
  }

  it('Should supply, borrow, get underwatch and liquidate', async function () {
    const { compoundBorrower, compoundLiquidator, snapshot } =
      await loadFixture(deployCompoundFixture);
    let snap;

    console.log('borrower address', compoundBorrower.address);
    console.log('liquidator address', compoundLiquidator.address);

    // before supply
    snap = await snapshot();
    console.log('Before supply ->', snap);

    // after supply
    await compoundBorrower.supply(SUPPLY_DAI_AMOUNT);
    snap = await snapshot();
    console.log('After supply ->', snap);

    // after enter markets
    await compoundBorrower.enterMarkets();
    snap = await snapshot();
    console.log('After enter markets ->', snap);

    // after borrow
    const [liquidity] = await compoundBorrower.getAccountLiquidity();
    const maxBorrow = await compoundBorrower.getMaxBorrow(liquidity);
    await compoundBorrower.borrow(maxBorrow);
    snap = await snapshot();
    console.log('After borrow ->', snap);

    // after 1000000 mined blocks
    await helpers.mine(1000000);
    // send any tx to Compound to update liquidity and shortfall
    await compoundBorrower.getBorrowBalance();
    snap = await snapshot();
    console.log('After some blocks ->', snap);

    const incentive = await compoundLiquidator.getLiquidationIncentive();
    console.log(
      `\nliquidation incentive: ${ethers.utils.formatEther(incentive)}`
    );
    const closeFactor = await compoundLiquidator.getCloseFactor();
    console.log(`close factor: ${ethers.utils.formatEther(closeFactor)}`);
    const borrowBalance = await compoundBorrower.callStatic.getBorrowBalance();
    const repayAmount = borrowBalance.mul(closeFactor);
    console.log(`repay amount: ${ethers.utils.formatEther(repayAmount)}`);

    const priceTokenSupply = await compoundBorrower.getPriceFeed(
      cTokenSupplyAddr
    );
    console.log(
      `priceTokenSupply: ${ethers.utils.formatEther(priceTokenSupply)}`
    );
    const priceTokenBorrow = await compoundBorrower.getPriceFeed(
      cTokenBorrowAddr
    );
    console.log(
      `priceTokenBorrow: ${ethers.utils.formatEther(priceTokenBorrow)}`
    );

    const amountToBeLiquidated =
      await compoundLiquidator.getAmountToBeLiquidated(
        cTokenBorrowAddr,
        cTokenSupplyAddr,
        repayAmount
      );
    console.log(
      `amount to be liquidated (cToken collateral):  ${amountToBeLiquidated}\n`
    );

    // after liquidation
    compoundLiquidator.liquidate(
      compoundBorrower.address,
      repayAmount,
      cTokenSupplyAddr
    );
    snap = await snapshot();
    console.log('After liquidation ->', snap);
  });
});
