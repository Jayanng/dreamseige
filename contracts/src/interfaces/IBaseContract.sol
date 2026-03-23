// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBaseContract {
    function getBaseStats(address player)
        external
        view
        returns (uint32 attack, uint32 defense, uint64 gold, uint64 wood, uint64 stone);

    function applyRaidResult(
        address attacker,
        address defender,
        uint64  lootGold,
        uint64  lootWood,
        uint64  lootStone,
        bool    attackerWon
    ) external;

    function hasBase(address player) external view returns (bool);
}
