// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CTokenInterface.sol";
import "./ComptrollerInterface.sol";
import "./PriceFeedInterface.sol";

import "hardhat/console.sol";

contract CompoundBorrower {
    event RatesLog(uint exchangeRate, uint supplyRatePerBlock);
    event BalanceUnderlyingLog(uint balanceUnderlying);
    event Log(string fn);

    IERC20 public tokenSupply;
    IERC20 public tokenBorrow;
    CTokenInterface public cTokenSupply;
    CTokenInterface public cTokenBorrow;

    ComptrollerInterface public immutable troll =
        ComptrollerInterface(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B);
    PriceFeedInterface public immutable priceFeed =
        PriceFeedInterface(0x65c816077C29b557BEE980ae3cC2dCE80204A0C5);

    constructor(
        address _tokenSupply,
        address _tokenBorrow,
        address _cTokenSupply,
        address _cTokenBorrow
    ) {
        require(
            _tokenSupply != address(0) &&
                _tokenBorrow != address(0) &&
                _cTokenSupply != address(0) &&
                _cTokenBorrow != address(0),
            "address != 0"
        );
        tokenSupply = IERC20(_tokenSupply);
        tokenBorrow = IERC20(_tokenBorrow);
        cTokenSupply = CTokenInterface(_cTokenSupply);
        cTokenBorrow = CTokenInterface(_cTokenBorrow);
    }

    function supply(uint _amount) external {
        // require(
        //     tokenSupply.transferFrom(msg.sender, address(this), _amount),
        //     "transferFrom failed"
        // );
        tokenSupply.approve(address(cTokenSupply), _amount);
        require(cTokenSupply.mint(_amount) == 0, "mint failed");
    }

    function getCTokenBalance() external view returns (uint) {
        return cTokenSupply.balanceOf(address(this));
    }

    function getSupplyBalance() external returns (uint balanceOfUnderlying) {
        balanceOfUnderlying = cTokenSupply.balanceOfUnderlying(address(this));
        emit BalanceUnderlyingLog(balanceOfUnderlying);
    }

    function estimateBalanceofUnderlying()
        external
        returns (uint balanceUnderlying)
    {
        uint cTokenBalance = cTokenSupply.balanceOf(address(this));
        uint exchangeRate = cTokenSupply.exchangeRateCurrent();
        uint tokenDecimals = 18;
        uint cTokenDecimals = 18;
        balanceUnderlying =
            (cTokenBalance * exchangeRate) /
            10**(18 + tokenDecimals - cTokenDecimals);
        emit BalanceUnderlyingLog(balanceUnderlying);
    }

    function getInfo()
        external
        returns (uint exchangeRate, uint supplyRatePerBlock)
    {
        exchangeRate = cTokenSupply.exchangeRateCurrent();
        supplyRatePerBlock = cTokenSupply.supplyRatePerBlock();
        emit RatesLog(exchangeRate, supplyRatePerBlock);
    }

    function redeem(uint amount) external {
        // cToken amount
        require(cTokenSupply.redeem(amount) == 0, "redeem failed");
    }

    function redeemUnderlying(uint amount) external {
        // token amount
        require(
            cTokenSupply.redeemUnderlying(amount) == 0,
            "redeemUnderlying failed"
        );
    }

    function getCollateralFactor()
        public
        view
        returns (uint collateralFactorMantissa)
    {
        (, collateralFactorMantissa, ) = troll.markets(address(cTokenSupply));
    }

    // get the most recent price for the underlying asset in USD with 6 decimals of precision.
    function getPriceFeed(address _cToken) external view returns (uint) {
        // scaled up by 1e18
        return priceFeed.getUnderlyingPrice(_cToken);
    }

    function getMaxBorrow(uint liquidity) public view returns (uint) {
        uint decimals = 18;

        // calculate max borrow
        uint priceTokenToBorrow = priceFeed.getUnderlyingPrice(
            address(cTokenBorrow)
        );
        uint maxBorrow = ((liquidity * (10**decimals)) / priceTokenToBorrow);
        return maxBorrow;
    }

    // account Liquidity represents the USD value borrowable by a user, before it reaches liquidation
    function getAccountLiquidity() public view returns (uint, uint) {
        (uint err, uint liquidity, uint shortfall) = troll.getAccountLiquidity(
            address(this)
        );
        require(err == 0, "getAccountLiquidity failed");
        return (liquidity, shortfall);
    }

    function enterMarkets() public {
        address[] memory cTokens = new address[](1);
        cTokens[0] = address(cTokenSupply);
        uint[] memory errors = troll.enterMarkets(cTokens);
        require(errors[0] == 0, "comptroller.enterMarkets failed");
    }

    function borrow(uint amountToBorrow) external {
        // check liquidity
        (uint err, uint liquidity, uint shortfall) = troll.getAccountLiquidity(
            address(this)
        );
        require(err == 0, "getAccountLiquidity failed");
        require(liquidity > 0, "liquidity = 0");
        require(shortfall == 0, "shortfall > 0");

        // borrow 50% of max borrow
        require(cTokenBorrow.borrow(amountToBorrow) == 0, "borrow failed");
    }

    // get current borrow balance (with interest) in units of the underlying asset (not view func)
    function getBorrowBalance() public returns (uint) {
        return cTokenBorrow.borrowBalanceCurrent(address(this));
    }

    // borrow rate
    function getBorrowRatePerBlock() public returns (uint) {
        return cTokenBorrow.borrowRatePerBlock();
    }

    function repay(uint _repayAmount) public {
        // _repayAmount - amount of the underlying borrowed asset to be repaid
        //  a value of -1 (i.e. 2^256 - 1) can be used to repay the full amount
        tokenBorrow.approve(address(cTokenBorrow), _repayAmount);
        require(cTokenBorrow.repayBorrow(_repayAmount) == 0, "repay failed");
    }

    fallback() external payable {
        emit Log("fallback");
    }

    receive() external payable {
        emit Log("receive");
    }
}
