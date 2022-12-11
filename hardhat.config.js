require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const { DAI_WHALE, DAI_ADDR, ERC20_ABI } = require('./constants');
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.17',
  networks: {
    hardhat: {
      chainId: 1337,
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        blockNumber: 15984597,
      },
    },
  },
};

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task('topup', 'Top up the account with DAI')
  .addParam('address', 'Top up this address')
  .addParam('amount', 'Top up amount')
  .setAction(async (taskArgs) => {
    const daiImpersonatedSigner = await ethers.getImpersonatedSigner(DAI_WHALE);
    const daiContract = await ethers.getContractAt(ERC20_ABI, DAI_ADDR);
    const daiAmount = ethers.utils.parseUnits(taskArgs.amount);
    const tx = await daiContract
      .connect(daiImpersonatedSigner)
      .transfer(taskArgs.address, daiAmount);
    await tx.wait();

    console.log(
      `The address ${taskArgs.address} has been toped up by ${taskArgs.amount} dai`
    );
  });

task('balance', 'Check the DAI balance at the address')
  .addParam('address', 'Checked address')
  .setAction(async (taskArgs) => {
    const daiContract = await ethers.getContractAt(ERC20_ABI, DAI_ADDR);
    const balance = await daiContract.balanceOf(taskArgs.address);
    console.log(
      `The balance for ${taskArgs.address} is ${ethers.utils.formatUnits(
        balance
      )} DAI`
    );
  });
