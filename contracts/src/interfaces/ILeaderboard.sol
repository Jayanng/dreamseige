// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILeaderboard {
    struct PlayerStats {
        address player;
        string  empireName;
        uint32  wins;
        uint32  losses;
        uint32  currentStreak;
        uint32  bestStreak;
        uint32  rank;
        uint64  totalLootEarned;
        uint64  totalLootLost;
        uint40  lastActivityAt;
        bool    registered;
    }

    function registerPlayer(address player, string calldata name) external;
    function updateEmpireName(address player, string calldata name) external;
    function getPlayerStats(address player) external view returns (PlayerStats memory);
}
