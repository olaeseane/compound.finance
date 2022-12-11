const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const { ethers } = require('hardhat');

const {
  DAI_WHALE,
  DAI_ADDR,
  cDAI_ADDR,
  LINK_ADDR,
  cLINK_ADDR,
  ERC20_ABI,
  CTOKEN_ABI,
} = require('../constants');

const SUPPLY_DAI_AMOUNT = ethers.utils.parseEther('500');

const tokenSupplyAddr = DAI_ADDR;
const cTokenSupplyAddr = cDAI_ADDR;
const tokenBorrowAddr = LINK_ADDR;
const cTokenBorrowAddr = cLINK_ADDR;

// const toWei = (value) => ethers.utils.parseEther(value.toString());

const fromWei = (value) =>
  ethers.utils.formatEther(
    typeof value === 'string' ? value : value.toString()
  );

xdescribe('CompoundBorrower', function () {
  async function deployCompoundFixture() {
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

    // get token and cToken contracts
    const tokenSupply = await ethers.getContractAt(ERC20_ABI, tokenSupplyAddr);
    const tokenBorrow = await ethers.getContractAt(ERC20_ABI, tokenBorrowAddr);

    const snapshot = async () => {
      let contractBalanceDai = await tokenSupply.balanceOf(
        compoundBorrower.address
      );
      contractBalanceDai = fromWei(contractBalanceDai);

      let contractBalanceLink = await tokenBorrow.balanceOf(
        compoundBorrower.address
      );
      contractBalanceLink = fromWei(contractBalanceLink);

      let { exchangeRate, supplyRatePerBlock } =
        await compoundBorrower.callStatic.getInfo();
      exchangeRate = fromWei(exchangeRate);
      supplyRatePerBlock = fromWei(supplyRatePerBlock);

      let balanceCTokenSupply = await compoundBorrower.getCTokenBalance();
      balanceCTokenSupply = fromWei(balanceCTokenSupply);

      let balanceOfUnderlying =
        await compoundBorrower.callStatic.getSupplyBalance();
      balanceOfUnderlying = fromWei(balanceOfUnderlying);

      let [liquidity] = await compoundBorrower.getAccountLiquidity();
      let maxBorrow = await compoundBorrower.getMaxBorrow(liquidity);
      liquidity = fromWei(liquidity);
      maxBorrow = fromWei(maxBorrow);

      let { borrowBalance } =
        await compoundBorrower.callStatic.getBorrowBalance();

      return {
        contractBalanceDai,
        exchangeRate,
        supplyRatePerBlock,
        balanceCTokenSupply,
        balanceOfUnderlying,
        liquidity,
        maxBorrow,
        contractBalanceLink,
      };
    };

    // topup contract with 500 DAI
    const daiImpersonatedSigner = await ethers.getImpersonatedSigner(DAI_WHALE);
    const daiContract = await ethers.getContractAt(ERC20_ABI, DAI_ADDR);
    const tx = await daiContract
      .connect(daiImpersonatedSigner)
      .transfer(compoundBorrower.address, SUPPLY_DAI_AMOUNT);
    await tx.wait();

    return {
      compoundBorrower,
      snapshot,
    };
  }

  xit('Should supply and redeem', async function () {
    const { compoundBorrower, snapshot } = await loadFixture(
      deployCompoundFixture
    );
    let snap;

    // before supply
    snap = await snapshot();
    console.log('Before supply ->', snap);

    // after supply
    await compoundBorrower.supply(SUPPLY_DAI_AMOUNT);
    snap = await snapshot();
    console.log('After supply ->', snap);

    // after 1000000 mined blocks
    await helpers.mine(1000000);
    snap = await snapshot();
    console.log('After some blocks (1000) ->', snap);

    // after redeem
    await compoundBorrower.redeem(
      ethers.utils.parseEther(snap.balanceCTokenSupply)
    );
    snap = await snapshot();
    console.log('After redeem ->', snap);
  });

  it('Should supply, borrow and repay', async function () {
    const { compoundBorrower, snapshot } = await loadFixture(
      deployCompoundFixture
    );
    let snap;

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
    const amountToBorrow = maxBorrow.div(2);
    await compoundBorrower.borrow(amountToBorrow);
    snap = await snapshot();
    console.log('After borrow ->', snap);

    // after repay
    await compoundBorrower.repay(amountToBorrow);
    snap = await snapshot();
    console.log('After repay ->', snap);
  });
});
