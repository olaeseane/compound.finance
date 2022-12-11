// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

interface CTokenInterface {
    function mint(uint mintAmount) external returns (uint);

    function redeem(uint redeemTokens) external returns (uint);

    function redeemUnderlying(uint redeemAmount) external returns (uint);

    function borrow(uint borrowAmount) external returns (uint);

    function repayBorrow(uint repayAmount) external returns (uint);

    function repayBorrowBehalf(address borrower, uint repayAmount)
        external
        returns (uint);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function liquidateBorrow(
        address borrower,
        uint amount,
        address collateral
    ) external returns (uint);

    function exchangeRateCurrent() external returns (uint);

    function getCash() external view returns (uint);

    function totalBorrowsCurrent() external view returns (uint);

    function borrowBalanceCurrent(address account) external returns (uint);

    function borrowRatePerBlock() external returns (uint);

    function totalSupply() external view returns (uint);

    function totalReserves() external view returns (uint);

    function reserveFactorMantissa() external returns (uint);

    function name() external view returns (string memory);

    function totalBorrows() external view returns (uint);

    function underlying() external returns (address);

    function approve(address spender, uint amount) external returns (bool);

    function allowance(address owner, address spender)
        external
        view
        returns (uint);

    function balanceOf(address owner) external view returns (uint);

    function balanceOfUnderlying(address owner) external returns (uint);

    function supplyRatePerBlock() external returns (uint);

    function accrueInterest() external returns (uint);

    function _addReserves(uint addAmount) external returns (uint);
}
