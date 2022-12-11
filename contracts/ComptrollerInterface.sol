// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "./CTokenInterface.sol";

interface ComptrollerInterface {
    function enterMarkets(address[] calldata cTokens)
        external
        returns (uint[] memory);

    function markets(address cTokenAddress)
        external
        view
        returns (
            bool,
            uint,
            bool
        );

    function getAccountLiquidity(address account)
        external
        view
        returns (
            uint,
            uint,
            uint
        );

    function getAllMarkets() external returns (CTokenInterface[] memory);

    function closeFactorMantissa() external view returns (uint);

    function liquidationIncentiveMantissa() external view returns (uint);

    function liquidateCalculateSeizeTokens(
        address cTokenBorrowed,
        address cTokenCollateral,
        uint actualRepayAmount
    ) external view returns (uint, uint);
}
