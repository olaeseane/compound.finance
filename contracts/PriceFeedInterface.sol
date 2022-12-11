// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

interface PriceFeedInterface {
    function price(string memory symbol) external view returns (uint);

    function getUnderlyingPrice(address cToken) external view returns (uint);
}
