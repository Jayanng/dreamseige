// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ILeaderboard.sol";

/// @title EmpireRegistry — DreamSiege Empire Identity System
/// @notice ╔══════════════════════════════════════════════════════════════════════╗
///         ║  DREAMSIEGE ⌬ EMPIRE REGISTRY ⌬ IDENTITY SUITE                  ║
///         ╚══════════════════════════════════════════════════════════════════════╝
/// @dev Lets players register and customize their empire identity.
///      Sub-second name updates via Somnia Reactivity SDK.
contract EmpireRegistry {

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ DATA ARCHITECTURE
    // ╬════════════════════════════════════════════════════════════════╬

    struct Empire {
        address owner;
        string  name;
        string  badge;        // emoji badge e.g. "🐉" "⚔️" "🛡️"
        uint8   tier;         // 0=Recruit 1=Warrior 2=Commander 3=Legend
        uint40  registeredAt;
        uint40  lastUpdatedAt;
        bool    exists;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ NEURAL STORAGE
    // ╬════════════════════════════════════════════════════════════════╬

    mapping(address => Empire)   public empires;
    mapping(string  => address)  public nameToOwner;  // enforce unique names

    ILeaderboard public leaderboard;
    address      public owner;

    uint256 public constant MAX_NAME_LENGTH = 20;
    uint256 public constant MIN_NAME_LENGTH = 3;
    uint256 public totalEmpires;

    // Tier thresholds (wins required)
    uint32 public constant TIER_WARRIOR   = 5;
    uint32 public constant TIER_COMMANDER = 20;
    uint32 public constant TIER_LEGEND    = 50;

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ REACTIVITY FEED: SOMNIA EMISSIONS
    // ╬════════════════════════════════════════════════════════════════╬

    event EmpireRegistered(
        address indexed player,
        string  name,
        string  badge,
        uint40  timestamp
    );

    event EmpireRenamed(
        address indexed player,
        string  oldName,
        string  newName,
        uint40  timestamp
    );

    event TierUpgraded(
        address indexed player,
        string  empireName,
        uint8   oldTier,
        uint8   newTier,
        uint40  timestamp
    );

    event BadgeUpdated(
        address indexed player,
        string  empireName,
        string  newBadge
    );

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ PROTOCOL EXCEPTIONS
    // ╬════════════════════════════════════════════════════════════════╬

    error NameTooShort();
    error NameTooLong();
    error NameTaken();
    error NameInvalid();
    error EmpireNotFound();
    error AlreadyRegistered();
    error NotEmpireOwner();
    error OnlyOwner();
    error TierNotReached();

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ CORE INITIALIZATION
    // ╬════════════════════════════════════════════════════════════════╬

    constructor(address _leaderboard) {
        leaderboard = ILeaderboard(_leaderboard);
        owner       = msg.sender;
    }

    function setLeaderboard(address _leaderboard) external {
        require(msg.sender == owner, "Only owner");
        leaderboard = ILeaderboard(_leaderboard);
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ IDENTITY PROTOCOLS
    // ╬════════════════════════════════════════════════════════════════╬

    /// @notice Register your empire with a unique name and badge
    /// @param name  Unique empire name (3–20 characters)
    /// @param badge Single emoji to represent your empire
    function registerEmpire(
        string calldata name,
        string calldata badge
    ) external {
        if (empires[msg.sender].exists) revert AlreadyRegistered();

        _validateName(name);

        string memory upperName = name;
        if (nameToOwner[upperName] != address(0)) revert NameTaken();

        empires[msg.sender] = Empire({
            owner:         msg.sender,
            name:          name,
            badge:         badge,
            tier:          0,
            registeredAt:  uint40(block.timestamp),
            lastUpdatedAt: uint40(block.timestamp),
            exists:        true
        });

        nameToOwner[name] = msg.sender;
        totalEmpires++;

        // Sync name to leaderboard (wrapped in try/catch to prevent OOG revert)
        try leaderboard.registerPlayer(msg.sender, name) {} catch {}

        emit EmpireRegistered(msg.sender, name, badge, uint40(block.timestamp));
    }

    /// @notice Rename your empire (old name is freed up for others)
    /// @param newName New unique empire name
    function renameEmpire(string calldata newName) external {
        if (!empires[msg.sender].exists) revert EmpireNotFound();

        _validateName(newName);
        if (nameToOwner[newName] != address(0)) revert NameTaken();

        string memory oldName = empires[msg.sender].name;

        // Free old name
        delete nameToOwner[oldName];

        // Assign new name
        empires[msg.sender].name          = newName;
        empires[msg.sender].lastUpdatedAt = uint40(block.timestamp);
        nameToOwner[newName]              = msg.sender;

        // Sync to leaderboard
        leaderboard.updateEmpireName(msg.sender, newName);

        emit EmpireRenamed(msg.sender, oldName, newName, uint40(block.timestamp));
    }

    /// @notice Update your empire badge emoji
    function updateBadge(string calldata newBadge) external {
        if (!empires[msg.sender].exists) revert EmpireNotFound();

        empires[msg.sender].badge         = newBadge;
        empires[msg.sender].lastUpdatedAt = uint40(block.timestamp);

        emit BadgeUpdated(msg.sender, empires[msg.sender].name, newBadge);
    }

    /// @notice Claim a tier upgrade based on win count
    /// @dev Anyone can call this for any player — tier is based on wins
    function claimTierUpgrade(address player) external {
        if (!empires[player].exists) revert EmpireNotFound();

        Empire storage empire = empires[player];
        uint32 wins           = leaderboard.getPlayerStats(player).wins;
        uint8  currentTier    = empire.tier;
        uint8  newTier        = currentTier;

        if      (wins >= TIER_LEGEND    && currentTier < 3) newTier = 3;
        else if (wins >= TIER_COMMANDER && currentTier < 2) newTier = 2;
        else if (wins >= TIER_WARRIOR   && currentTier < 1) newTier = 1;

        if (newTier == currentTier) revert TierNotReached();

        empire.tier          = newTier;
        empire.lastUpdatedAt = uint40(block.timestamp);

        emit TierUpgraded(player, empire.name, currentTier, newTier, uint40(block.timestamp));
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ TACTICAL INTEL: READ OPERATIONS
    // ╬════════════════════════════════════════════════════════════════╬

    function getEmpire(address player)
        external view
        returns (Empire memory)
    {
        return empires[player];
    }

    function getEmpireByName(string calldata name)
        external view
        returns (Empire memory)
    {
        address empireOwner = nameToOwner[name];
        if (empireOwner == address(0)) revert EmpireNotFound();
        return empires[empireOwner];
    }

    function hasEmpire(address player)
        external view
        returns (bool)
    {
        return empires[player].exists;
    }

    function getTierName(uint8 tier)
        external pure
        returns (string memory)
    {
        if (tier == 0) return "Recruit";
        if (tier == 1) return "Warrior";
        if (tier == 2) return "Commander";
        if (tier == 3) return "Legend";
        return "Unknown";
    }

    function isNameAvailable(string calldata name)
        external view
        returns (bool)
    {
        return nameToOwner[name] == address(0);
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ INTERNAL HEURISTICS
    // ╬════════════════════════════════════════════════════════════════╬

    function _validateName(string calldata name) internal pure {
        bytes memory b = bytes(name);

        if (b.length < MIN_NAME_LENGTH) revert NameTooShort();
        if (b.length > MAX_NAME_LENGTH) revert NameTooLong();

        // Only allow alphanumeric, spaces, apostrophes, hyphens
        for (uint i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool valid = (
                (c >= 0x30 && c <= 0x39) || // 0-9
                (c >= 0x41 && c <= 0x5A) || // A-Z
                (c >= 0x61 && c <= 0x7A) || // a-z
                c == 0x20 ||                 // space
                c == 0x27 ||                 // apostrophe
                c == 0x2D                    // hyphen
            );
            if (!valid) revert NameInvalid();
        }
    }
}
