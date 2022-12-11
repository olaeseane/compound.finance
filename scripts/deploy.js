// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');

const {
  DAI_WHALE,
  DAI_ADDR,
  cDAI_ADDR,
  LINK_ADDR,
  cLINK_ADDR,
  ERC20_ABI,
} = require('../constants');

async function main() {
  // deploy TestCompound contract
  const TestCompound = await hre.ethers.getContractFactory('TestCompound');
  const testCompound = await TestCompound.deploy(
    DAI_ADDR,
    LINK_ADDR,
    cDAI_ADDR,
    cLINK_ADDR
  );
  await testCompound.deployed();
  console.log(
    `Contract "TestCompound" was deployed to ${testCompound.address}`
  );

  // topup address with 500 DAI
  const [owner] = await ethers.getSigners();
  const daiImpersonatedSigner = await ethers.getImpersonatedSigner(DAI_WHALE);
  const daiContract = await ethers.getContractAt(ERC20_ABI, DAI_ADDR);
  const amount = '500';
  const tx = await daiContract
    .connect(daiImpersonatedSigner)
    .transfer(owner.address, ethers.utils.parseUnits(amount));
  await tx.wait();

  const balanceAfter = await daiContract.balanceOf(owner.address);
  console.log(
    `The address ${
      owner.address
    } has been toped up by ${ethers.utils.formatEther(balanceAfter)} dai`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
