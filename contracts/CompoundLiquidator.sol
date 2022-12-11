// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CTokenInterface.sol";
import "./ComptrollerInterface.sol";
import "./PriceFeedInterface.sol";

import "hardhat/console.sol";

contract CompoundLiquidator {
    event Log(string message, uint val);

    IERC20 public tokenBorrow;
    CTokenInterface public cTokenBorrow;

    ComptrollerInterface public immutable troll =
        ComptrollerInterface(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B);
    PriceFeedInterface public immutable priceFeed =
        PriceFeedInterface(0x65c816077C29b557BEE980ae3cC2dCE80204A0C5);

    constructor(address _tokenBorrow, address _cTokenBorrow) {
        tokenBorrow = IERC20(_tokenBorrow);
        cTokenBorrow = CTokenInterface(_cTokenBorrow);
    }

    function getCloseFactor() public view returns (uint) {
        return troll.closeFactorMantissa();
    }

    function getLiquidationIncentive() public view returns (uint) {
        return troll.liquidationIncentiveMantissa();
    }

    // * @notice Calculate number of tokens of collateral asset to seize given an underlying amount
    // * @param cTokenBorrowed The address of the borrowed cToken
    // * @param cTokenCollateral The address of the collateral cToken
    // * @param actualRepayAmount The amount of cTokenBorrowed underlying to convert into cTokenCollateral tokens
    function getAmountToBeLiquidated(
        address _cTokenBorrowed,
        address _cTokenCollateral,
        uint _actualRepayAmount
    ) external view returns (uint) {
        /*
         * Get the exchange rate and calculate the number of collateral tokens to seize:
         *  seizeAmount = actualRepayAmount * liquidationIncentive * priceBorrowed / priceCollateral
         *  seizeTokens = seizeAmount / exchangeRate
         *      = actualRepayAmount * (liquidationIncentive * priceBorrowed) / (priceCollateral * exchangeRate)
         */
        (uint error, uint cTokenCollateralAmount) = troll
            .liquidateCalculateSeizeTokens(
                _cTokenBorrowed,
                _cTokenCollateral,
                _actualRepayAmount
            );

        require(error == 0, "liquidateCalculateSeizeTokens failed");

        return cTokenCollateralAmount;
    }

    function liquidate(
        address _borrower,
        uint _repayAmount,
        address _cTokenCollateral
    ) external {
        tokenBorrow.approve(address(cTokenBorrow), _repayAmount);
        uint err = cTokenBorrow.liquidateBorrow(
            _borrower,
            _repayAmount,
            _cTokenCollateral
        );
        require(err == 0, "liquidate failed");
    }

    // get amount liquidated (not view func)
    function getSupplyBalance(address _cTokenCollateral)
        external
        returns (uint)
    {
        return
            CTokenInterface(_cTokenCollateral).balanceOfUnderlying(
                address(this)
            );
    }
}
