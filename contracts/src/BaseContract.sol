/*
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║          ⌬  D R E A M S I E G E  —  B A S E C O R E  ⌬      ║
 * ║                  CITADEL FOUNDATION MODULE                    ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Governs the persistent on-chain empire for each commander.   ║
 * ║  Manages the 10x10 tactical grid, resource economy,          ║
 * ║  structure upgrades, and combat stat calculations.            ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  Reactivity Events:                                           ║
 * ║    » ResourceTick      — live resource bar updates            ║
 * ║    » BuildingPlaced    — grid cell activates in real-time     ║
 * ║    » UpgradeComplete   — upgrade timer resolves instantly     ║
 * ║    » BaseStatsUpdated  — combat power syncs cross-screen      ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IBaseContract.sol";

interface IResourceVault {
    function initializeVault(address player) external;
    function collectResourcesFor(address player) external;
    function updateProductionRates(address player, uint64 c, uint64 b, uint64 m, uint64 v) external;
    function deductForUpgrade(address player, uint64 c, uint64 b, uint64 m) external;
}

/// @title BaseContract — DreamSiege core base management
/// @notice Handles base initialization, 10x10 grid building placement,
///         resource accumulation, and upgrade progression.
/// @dev All state changes emit events consumed by Somnia Reactivity SDK.
///      Resource ticking is triggered by calling tickResources() — either
///      by the player on collectResources() or by an authorized keeper.
contract BaseContract is IBaseContract {

    // ⌬ TACTICAL DATA STRUCTURES

    enum BuildingType {
        EMPTY,       // 0 — unoccupied slot
        MINE,        // 1 — produces gold
        LUMBER_MILL, // 2 — produces wood
        QUARRY,      // 3 — produces stone
        BARRACKS,    // 4 — produces attack power
        WALL,        // 5 — contributes defense
        TOWER,       // 6 — contributes defense + attack range
        VAULT        // 7 — protects resources from raids
    }

    struct Building {
        BuildingType buildingType;
        uint8        level;         // 1–10
        uint40       upgradeEndsAt; // timestamp when current upgrade completes (0 = idle)
    }

    struct Base {
        address  owner;
        bool     initialized;
        uint64   gold;
        uint64   wood;
        uint64   stone;
        uint32   attackPower;
        uint32   defensePower;
        uint40   lastTickAt;   // timestamp of last resource tick
        uint32   totalWins;
        uint32   totalLosses;
        // O(1) Rate Counters
        uint64   goldRate;
        uint64   woodRate;
        uint64   stoneRate;
        uint8    buildingCount; // Track number of active buildings
    }

    struct UpgradeJob {
        uint256  baseId;
        uint8    slot;          // 0–99 for 10x10 grid
        uint40   endsAt;
        bool     claimed;
    }

    // ⌬ NEURAL STORAGE

    /// @dev baseId = uint256(keccak256(abi.encodePacked(owner)))
    mapping(address => uint256)         public  ownerToBaseId;
    mapping(uint256 => Base)            public  bases;
    /// @dev key = keccak256(abi.encodePacked(baseId, slot))
    mapping(bytes32 => Building)        public  buildings;
    mapping(uint256 => UpgradeJob)      public  upgradeJobs;
    uint256                             private _upgradeJobCounter;

    address public attackContract;  // set after AttackContract deploy
    address public resourceVault;    // set after ResourceVault deploy
    address public owner;           // protocol admin

    // Resource tick rate per building level per block-second
    uint64 public constant RESOURCE_PER_TICK_PER_LEVEL = 10;
    uint40 public constant TICK_INTERVAL               = 30; // seconds

    // Upgrade cost multipliers (base costs × level)
    uint64 public constant UPGRADE_GOLD_BASE   = 100;
    uint64 public constant UPGRADE_WOOD_BASE   = 50;
    uint64 public constant UPGRADE_STONE_BASE  = 50;
    uint40 public constant UPGRADE_DURATION    = 60; // seconds per level

    // ⌬ REACTIVITY BROADCAST LAYER

    event BaseInitialized(address indexed owner, uint256 indexed baseId);
    event BuildingPlaced(uint256 indexed baseId, uint8 slot, BuildingType buildingType);
    event UpgradeStarted(uint256 indexed baseId, uint8 slot, uint8 newLevel, uint40 endsAt, uint256 jobId);
    event UpgradeComplete(uint256 indexed baseId, uint8 slot, uint8 newLevel, uint256 jobId);
    event ResourceTick(uint256 indexed baseId, uint64 gold, uint64 wood, uint64 stone, uint40 timestamp);
    event ResourcesCollected(address indexed collector, uint256 indexed baseId, uint64 gold, uint64 wood, uint64 stone);
    event BaseStatsUpdated(uint256 indexed baseId, uint32 attackPower, uint32 defensePower);

    // ⌬ REVERT CODES

    error AlreadyInitialized();
    error NotInitialized();
    error NotBaseOwner();
    error InvalidSlot();
    error SlotOccupied();
    error SlotEmpty();
    error UpgradeAlreadyInProgress();
    error UpgradeNotComplete();
    error InsufficientResources();
    error MaxLevelReached();
    error OnlyAttackContract();
    error CooldownActive();

    // ─────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyBaseOwner() {
        uint256 baseId = ownerToBaseId[msg.sender];
        if (bases[baseId].owner != msg.sender) revert NotBaseOwner();
        _;
    }

    modifier onlyInitialized(address player) {
        uint256 baseId = ownerToBaseId[player];
        if (!bases[baseId].initialized) revert NotInitialized();
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not admin");
        _;
    }

    // ⌬ CITADEL INITIALIZATION

    constructor() {
        owner = msg.sender;
    }

    // ⌬ COMMAND AUTHORITY

    function setAttackContract(address _attackContract) external onlyOwner {
        attackContract = _attackContract;
    }

    function setResourceVault(address _resourceVault) external onlyOwner {
        resourceVault = _resourceVault;
    }

    // ⌬ TACTICAL OPERATIONS

    /// @notice Creates a new base for the caller. One base per address.
    function initializeBase() external {
        if (ownerToBaseId[msg.sender] != 0) revert AlreadyInitialized();

        uint256 baseId = uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp)));
        // ensure non-zero
        if (baseId == 0) baseId = 1;

        ownerToBaseId[msg.sender] = baseId;
        bases[baseId] = Base({
            owner:         msg.sender,
            initialized:   true,
            gold:          500,
            wood:          300,
            stone:         150, // Corrected to match ResourceVault minera
            attackPower:   10,
            defensePower:  10,
            lastTickAt:    uint40(block.timestamp),
            totalWins:     0,
            totalLosses:   0,
            goldRate:      15, // Match Vault BASE_CREDITS_RATE
            woodRate:      10, // Match Vault BASE_BIOMASS_RATE
            stoneRate:     5,  // Match Vault BASE_MINERA_RATE
            buildingCount: 0
        });

        // Link with ResourceVault
        if (resourceVault != address(0)) {
            IResourceVault(resourceVault).initializeVault(msg.sender);
        }

        emit BaseInitialized(msg.sender, baseId);
    }

    /// @notice Place a building in an empty slot on the caller's base.
    /// @param slot 0–99 representing position on the 10x10 grid
    /// @param buildingType The type of building to place
    function placeBuilding(uint8 slot, BuildingType buildingType)
        external
        onlyBaseOwner
    {
        if (slot >= 100) revert InvalidSlot();
        if (buildingType == BuildingType.EMPTY) revert InvalidSlot();

        uint256 baseId = ownerToBaseId[msg.sender];
        bytes32 key    = _buildingKey(baseId, slot);

        if (buildings[key].buildingType != BuildingType.EMPTY) revert SlotOccupied();

        _placeBuilding(baseId, slot, buildingType, true);
    }

    /// @notice Begin upgrading a building. Deducts resources immediately.
    /// @param slot The grid slot of the building to upgrade
    /// @notice Instantly upgrades a building. Deducts resources and applies stats immediately.
    function startUpgrade(uint8 slot) external onlyBaseOwner {
        if (slot >= 100) revert InvalidSlot();

        uint256 baseId = ownerToBaseId[msg.sender];
        
        // Settle accumulated resources BEFORE checking balances
        _tickResources(baseId);

        bytes32 key = _buildingKey(baseId, slot);
        Building storage bldg = buildings[key];

        if (bldg.buildingType == BuildingType.EMPTY) revert SlotEmpty();
        if (bldg.level >= 10) revert MaxLevelReached();

        uint8 newLevel = bldg.level + 1;
        uint64 goldCost = UPGRADE_GOLD_BASE * newLevel;
        uint64 woodCost = UPGRADE_WOOD_BASE * newLevel;
        uint64 stoneCost = UPGRADE_STONE_BASE * newLevel;

        Base storage base = bases[baseId];

        // 1. Primary Deduction: ResourceVault holds the actual spendable wealth
        if (resourceVault != address(0)) {
            IResourceVault(resourceVault).deductForUpgrade(msg.sender, goldCost, woodCost, stoneCost);
        } else {
            // Fallback for isolated testing: check internal balances
            if (base.gold < goldCost || base.wood < woodCost || base.stone < stoneCost) {
                revert InsufficientResources();
            }
        }

        // 2. Secondary Sync: Best-effort update of internal "display" counters
        if (base.gold  >= goldCost)  base.gold  -= goldCost; else base.gold = 0;
        if (base.wood  >= woodCost)  base.wood  -= woodCost; else base.wood = 0;
        if (base.stone >= stoneCost) base.stone -= stoneCost; else base.stone = 0;

        // INSTANT UPGRADE LOGIC
        _updateBuildingContribution(baseId, bldg.buildingType, bldg.level, false); // subtract old
        bldg.level = newLevel;
        bldg.upgradeEndsAt = 0; // No timer needed
        _updateBuildingContribution(baseId, bldg.buildingType, bldg.level, true);  // add new

        // Emit completion immediately (passing 0 for jobId since we deprecated jobs)
        emit UpgradeComplete(baseId, slot, newLevel, 0);
        emit BaseStatsUpdated(baseId, base.attackPower, base.defensePower);
    }

    /// @notice Repairs base state by recalculating all rates and power from scratch.
    function syncStats() external onlyBaseOwner {
        _tickResources(ownerToBaseId[msg.sender]);
        _recalculateStats(ownerToBaseId[msg.sender]);
    }

    /// @notice Trigger resource accumulation since last tick. Callable by anyone.
    function collectResources() external onlyInitialized(msg.sender) {
        uint256 baseId = ownerToBaseId[msg.sender];
        _tickResources(baseId);

        // Sync with ResourceVault (Vanguard, etc.)
        if (resourceVault != address(0)) {
            IResourceVault(resourceVault).collectResourcesFor(msg.sender);
        }

        Base storage base = bases[baseId];
        emit ResourcesCollected(msg.sender, baseId, base.gold, base.wood, base.stone);
    }

    /// @notice Called by keeper or player to advance resource state for any base.
    function tickResourcesFor(address player) external onlyInitialized(player) {
        uint256 baseId = ownerToBaseId[player];
        _tickResources(baseId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ATTACK CONTRACT INTERFACE (IBaseContract)
    // ─────────────────────────────────────────────────────────────────────────

    function getBaseStats(address player)
        external
        view
        returns (uint32 attack, uint32 defense, uint64 gold, uint64 wood, uint64 stone)
    {
        uint256 baseId = ownerToBaseId[player];
        Base storage base = bases[baseId];
        return (base.attackPower, base.defensePower, base.gold, base.wood, base.stone);
    }

    function applyRaidResult(
        address attacker,
        address defender,
        uint64  lootGold,
        uint64  lootWood,
        uint64  lootStone,
        bool    attackerWon
    ) external {
        if (msg.sender != attackContract) revert OnlyAttackContract();

        uint256 atkBaseId = ownerToBaseId[attacker];
        uint256 defBaseId = ownerToBaseId[defender];

        Base storage atkBase = bases[atkBaseId];
        Base storage defBase = bases[defBaseId];

        if (attackerWon) {
            uint64 actualGold  = lootGold  > defBase.gold  ? defBase.gold  : lootGold;
            uint64 actualWood  = lootWood  > defBase.wood  ? defBase.wood  : lootWood;
            uint64 actualStone = lootStone > defBase.stone ? defBase.stone : lootStone;

            defBase.gold  -= actualGold;
            defBase.wood  -= actualWood;
            defBase.stone -= actualStone;

            atkBase.gold  += actualGold;
            atkBase.wood  += actualWood;
            atkBase.stone += actualStone;

            atkBase.totalWins++;
            defBase.totalLosses++;
        } else {
            atkBase.totalLosses++;
            defBase.totalWins++;
        }
    }

    // ⌬ INTELLIGENCE QUERIES

    function getBase(address player) external view returns (Base memory) {
        return bases[ownerToBaseId[player]];
    }

    function getBuilding(address player, uint8 slot) external view returns (Building memory) {
        uint256 baseId = ownerToBaseId[player];
        return buildings[_buildingKey(baseId, slot)];
    }

    function getAllBuildings(address player) external view returns (Building[100] memory result) {
        uint256 baseId = ownerToBaseId[player];
        for (uint8 i = 0; i < 100; i++) {
            result[i] = buildings[_buildingKey(baseId, i)];
        }
    }

    function hasBase(address player) external view returns (bool) {
        return bases[ownerToBaseId[player]].initialized;
    }

    function getUpgradeJob(uint256 jobId) external view returns (UpgradeJob memory) {
        return upgradeJobs[jobId];
    }

    // ⌬ INTERNAL SYSTEMS

    function _buildingKey(uint256 baseId, uint8 slot) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(baseId, slot));
    }

    function _placeBuilding(
        uint256 baseId, 
        uint8 slot, 
        BuildingType buildingType,
        bool recalculate
    ) internal {
        bytes32 key = _buildingKey(baseId, slot);
        buildings[key] = Building({
            buildingType:  buildingType,
            level:         1,
            upgradeEndsAt: 0
        });
        
        bases[baseId].buildingCount++;
        
        emit BuildingPlaced(baseId, slot, buildingType);
        
        if (recalculate) {
            _recalculateStats(baseId);
        }
    }

    function _recalculateStats(uint256 baseId) internal {
        uint32 attack  = 0;
        uint32 defense = 0;
        uint64 goldR   = 0;
        uint64 woodR   = 0;
        uint64 stoneR  = 0;
        uint8  counted = 0;
        uint8  totalBuildings = bases[baseId].buildingCount;

        for (uint8 i = 0; i < 100; i++) {
            if (counted >= totalBuildings) break;

            bytes32 key = _buildingKey(baseId, i);
            Building storage bldg = buildings[key];
            if (bldg.buildingType == BuildingType.EMPTY) continue;

            counted++;
            uint64 rate = RESOURCE_PER_TICK_PER_LEVEL * uint64(bldg.level);

            if (bldg.buildingType == BuildingType.MINE)        goldR  += rate;
            if (bldg.buildingType == BuildingType.LUMBER_MILL) woodR  += rate;
            if (bldg.buildingType == BuildingType.QUARRY)      stoneR += rate;
            if (bldg.buildingType == BuildingType.BARRACKS)    attack  += uint32(bldg.level) * 15;
            if (bldg.buildingType == BuildingType.WALL)        defense += uint32(bldg.level) * 10;
            if (bldg.buildingType == BuildingType.TOWER) {  
                attack  += uint32(bldg.level) * 8; 
                defense += uint32(bldg.level) * 8; 
            }
        }

        if (attack  < 10) attack  = 10;
        if (defense < 10) defense = 10;

        Base storage base = bases[baseId];
        base.attackPower  = attack;
        base.defensePower = defense;
        base.goldRate     = goldR  + 15; // Include base credits rate
        base.woodRate     = woodR  + 10; // Include base biomass rate
        base.stoneRate    = stoneR + 5;  // Include base minera rate

        // Sync rates with ResourceVault (adding base rates)
        if (resourceVault != address(0)) {
            IResourceVault(resourceVault).updateProductionRates(
                base.owner,
                goldR  + 15, // Credits (BASE_CREDITS_RATE=15)
                woodR  + 10, // Biomass (BASE_BIOMASS_RATE=10)
                stoneR + 5,  // Minera  (BASE_MINERA_RATE=5)
                2            // Vanguard (BASE_VANGUARD_RATE=2)
            );
        }

        emit BaseStatsUpdated(baseId, attack, defense);
    }

    function _tickResources(uint256 baseId) internal {
        Base storage base = bases[baseId];
        uint40 now_       = uint40(block.timestamp);
        uint40 elapsed    = now_ - base.lastTickAt;

        if (elapsed < TICK_INTERVAL) return;

        uint40 ticks = elapsed / TICK_INTERVAL;

        // Audit Fix: O(1) Resource calculation
        base.gold  += base.goldRate  * ticks;
        base.wood  += base.woodRate  * ticks;
        base.stone += base.stoneRate * ticks;

        uint64 cap = type(uint64).max / 4;
        if (base.gold  > cap) base.gold  = cap;
        if (base.wood  > cap) base.wood  = cap;
        if (base.stone > cap) base.stone = cap;

        base.lastTickAt = now_;

        emit ResourceTick(baseId, base.gold, base.wood, base.stone, now_);
    }

    /// @notice Incremental update for O(1) complexity
    function _updateBuildingContribution(uint256 baseId, BuildingType bType, uint8 level, bool add) internal {
        Base storage base = bases[baseId];
        uint64 rate = RESOURCE_PER_TICK_PER_LEVEL * uint64(level);
        
        if (add) {
            if (bType == BuildingType.MINE)        base.goldRate  += rate;
            if (bType == BuildingType.LUMBER_MILL) base.woodRate  += rate;
            if (bType == BuildingType.QUARRY)      base.stoneRate += rate;
            if (bType == BuildingType.BARRACKS)    base.attackPower  += uint32(level) * 15;
            if (bType == BuildingType.WALL)        base.defensePower += uint32(level) * 10;
            if (bType == BuildingType.TOWER)       { base.attackPower += uint32(level) * 8; base.defensePower += uint32(level) * 8; }
        } else {
            if (bType == BuildingType.MINE)        base.goldRate  -= rate;
            if (bType == BuildingType.LUMBER_MILL) base.woodRate  -= rate;
            if (bType == BuildingType.QUARRY)      base.stoneRate -= rate;
            if (bType == BuildingType.BARRACKS)    base.attackPower  -= uint32(level) * 15;
            if (bType == BuildingType.WALL)        base.defensePower -= uint32(level) * 10;
            if (bType == BuildingType.TOWER)       { base.attackPower -= uint32(level) * 8; base.defensePower -= uint32(level) * 8; }
        }
        
        // Floor values
        if (base.attackPower  < 10) base.attackPower  = 10;
        if (base.defensePower < 10) base.defensePower = 10;
    }
}
