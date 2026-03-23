// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISomniaReactivityPrecompile.sol";
import "./interfaces/ISomniaEventHandler.sol";

/// @title LeaderboardContract — DreamSiege Hall of Legends
/// @notice ╔══════════════════════════════════════════════════════════════════════╗
///         ║  DREAMSIEGE ⌬ HALL OF LEGENDS ⌬ TACTICAL RANKING SYSTEM         ║
///         ╚══════════════════════════════════════════════════════════════════════╝
/// @dev Tracks all player stats, win streaks, and maintains a live top-50 
///      ranking updated after every battle. Interfaced with Somnia Reactivity.
contract LeaderboardContract {

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ DATA ARCHITECTURE
    // ╬════════════════════════════════════════════════════════════════╬

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

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ NEURAL STORAGE
    // ╬════════════════════════════════════════════════════════════════╬

    mapping(address => PlayerStats) public playerStats;
    address[10]                     public topPlayers;
    uint8                           public topPlayerCount;

    address public pvpArena;
    address public empireRegistry;
    address public owner;

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ REACTIVITY FEED: SOMNIA EMISSIONS
    // ╬════════════════════════════════════════════════════════════════╬

    event WinRecorded(
        address indexed player,
        uint32  totalWins,
        uint32  streak,
        uint64  lootEarned
    );

    event LossRecorded(
        address indexed player,
        uint32  totalLosses,
        uint64  lootLost
    );

    event RankingUpdated(
        address indexed player,
        uint32  newRank,
        uint32  totalWins,
        string  empireName
    );

    event WinStreakUpdated(
        address indexed player,
        uint32  streak,
        bool    isNewBest,
        string  empireName
    );

    event PlayerRegistered(
        address indexed player,
        string  empireName
    );

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ PROTOCOL EXCEPTIONS
    // ╬════════════════════════════════════════════════════════════════╬

    error OnlyArena();
    error OnlyOwner();
    error NotRegistered();

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ CORE INITIALIZATION
    // ╬════════════════════════════════════════════════════════════════╬

    constructor() {
        owner = msg.sender;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ COMMAND UPLINK: ADMINISTRATIVE
    // ╬════════════════════════════════════════════════════════════════╬

    function setPvPArena(address _arena) external {
        if (msg.sender != owner) revert OnlyOwner();
        pvpArena = _arena;
    }

    function setEmpireRegistry(address _registry) external {
        if (msg.sender != owner) revert OnlyOwner();
        empireRegistry = _registry;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ ENGAGEMENT LOGISTICS
    // ╬════════════════════════════════════════════════════════════════╬

    event LeaderboardDataStream(
        address indexed player,
        uint32  wins,
        uint32  losses,
        uint64  totalLootEarned,
        uint40  timestamp
    );

    /// @notice Record full battle outcome for both winner and loser
    /// @dev Only callable by PvPArena contract
    function recordBattleResult(
        address winner,
        address loser,
        uint64  lootAmount
    ) external {
        if (msg.sender != pvpArena) revert OnlyArena();

        _ensureRegistered(winner);
        _ensureRegistered(loser);

        _recordWin(winner, lootAmount);
        _recordLoss(loser, lootAmount);
        _updateRanking(winner);

        // Emit Data Stream for offline processing / frontend aggregation
        PlayerStats storage w = playerStats[winner];
        emit LeaderboardDataStream(winner, w.wins, w.losses, w.totalLootEarned, uint40(block.timestamp));
        
        PlayerStats storage l = playerStats[loser];
        emit LeaderboardDataStream(loser, l.wins, l.losses, l.totalLootEarned, uint40(block.timestamp));
    }

    /// @notice Register a new player when they initialize their base
    function registerPlayer(
        address player,
        string calldata empireName
    ) external {
        // Allow pvpArena or empireRegistry to register players
        require(
            msg.sender == pvpArena       ||
            msg.sender == empireRegistry ||
            msg.sender == owner,
            "Not authorized"
        );

        if (playerStats[player].registered) return; // already registered, no revert

        playerStats[player].player     = player;
        playerStats[player].empireName = empireName;
        playerStats[player].registered = true;
        playerStats[player].lastActivityAt = uint40(block.timestamp);

        emit PlayerRegistered(player, empireName);
    }

    /// @notice Update empire name (called by EmpireRegistry)
    function updateEmpireName(
        address player,
        string calldata newName
    ) external {
        require(msg.sender == empireRegistry || msg.sender == owner, "Not authorized");
        playerStats[player].empireName = newName;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ TACTICAL INTEL: READ OPERATIONS
    // ╬════════════════════════════════════════════════════════════════╬

    function getPlayerStats(address player)
        external view
        returns (PlayerStats memory)
    {
        return playerStats[player];
    }


    function getWinRate(address player)
        external view
        returns (uint256 rate)
    {
        PlayerStats storage stats = playerStats[player];
        uint32 total = stats.wins + stats.losses;
        if (total == 0) return 0;
        return (uint256(stats.wins) * 100) / total;
    }

    function getPlayerRank(address player)
        external view
        returns (uint32)
    {
        return playerStats[player].rank;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ INTERNAL HEURISTICS
    // ╬════════════════════════════════════════════════════════════════╬

    function _ensureRegistered(address player) internal {
        if (!playerStats[player].registered) {
            playerStats[player] = PlayerStats({
                player:          player,
                empireName:      _defaultName(player),
                wins:            0,
                losses:          0,
                currentStreak:   0,
                bestStreak:      0,
                rank:            0,
                totalLootEarned: 0,
                totalLootLost:   0,
                lastActivityAt:  uint40(block.timestamp),
                registered:      true
            });
        }
    }

    function _defaultName(address player)
        internal pure
        returns (string memory)
    {
        // Generate a default name from address bytes
        bytes memory addr   = abi.encodePacked(player);
        bytes memory result = new bytes(8);
        bytes memory hex_  = "0123456789ABCDEF";
        for (uint i = 0; i < 4; i++) {
            result[i*2]   = hex_[uint8(addr[i]) >> 4];
            result[i*2+1] = hex_[uint8(addr[i]) & 0x0f];
        }
        return string(abi.encodePacked("Empire-", result));
    }

    function _recordWin(address player, uint64 loot) internal {
        PlayerStats storage stats = playerStats[player];
        stats.wins++;
        stats.currentStreak++;
        stats.totalLootEarned  += loot;
        stats.lastActivityAt    = uint40(block.timestamp);

        bool isNewBest = false;
        if (stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
            isNewBest        = true;
        }

        emit WinRecorded(player, stats.wins, stats.currentStreak, loot);

        if (stats.currentStreak >= 2 || isNewBest) {
            emit WinStreakUpdated(
                player,
                stats.currentStreak,
                isNewBest,
                stats.empireName
            );
        }
    }

    function _recordLoss(address player, uint64 loot) internal {
        PlayerStats storage stats = playerStats[player];
        stats.losses++;
        stats.currentStreak  = 0;
        stats.totalLootLost += loot;
        stats.lastActivityAt = uint40(block.timestamp);

        emit LossRecorded(player, stats.losses, loot);
    }

    function getTopPlayers(uint8 n)
        external view
        returns (address[] memory players, uint32[] memory wins, string[] memory names)
    {
        uint8 count = n < topPlayerCount ? n : topPlayerCount;
        players = new address[](count);
        wins    = new uint32[](count);
        names   = new string[](count);

        for (uint8 i = 0; i < count; i++) {
            players[i] = topPlayers[i];
            wins[i]    = playerStats[topPlayers[i]].wins;
            names[i]   = playerStats[topPlayers[i]].empireName;
        }
    }

    function _updateRanking(address player) internal {
        // Insertion sort for top 10 (very efficient O(N))
        uint32 pWins = playerStats[player].wins;
        
        // Remove if already in list
        uint8 idx = 255;
        for (uint8 i = 0; i < topPlayerCount; i++) {
            if (topPlayers[i] == player) {
                idx = i;
                break;
            }
        }
        
        if (idx != 255) {
            // Already in list, shift up if needed
            for (uint8 i = idx; i > 0; i--) {
                if (pWins > playerStats[topPlayers[i-1]].wins) {
                    topPlayers[i] = topPlayers[i-1];
                    topPlayers[i-1] = player;
                } else break;
            }
        } else {
            // New entry candidate
            if (topPlayerCount < 10) {
                topPlayers[topPlayerCount] = player;
                topPlayerCount++;
                _updateRanking(player); // Recurse once to sort
            } else if (pWins > playerStats[topPlayers[9]].wins) {
                topPlayers[9] = player;
                _updateRanking(player); // Recurse once to sort
            }
        }
    }
}
