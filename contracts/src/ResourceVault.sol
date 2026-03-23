// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IBaseContract.sol";

/// @title ResourceVault — DreamSiege On-Chain Resource Economy
/// @notice ╔══════════════════════════════════════════════════════════════════════╗
///         ║  DREAMSIEGE ⌬ RESOURCE VAULT ⌬ ECONOMIC SUITE                  ║
///         ╚══════════════════════════════════════════════════════════════════════╝
/// @dev Manages Credits, Biomass, Minera, and Vanguard as proper on-chain 
///      balances. Interfaced with Somnia Reactivity for real-time tick-ups.
contract ResourceVault {

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ DATA ARCHITECTURE
    // ╬════════════════════════════════════════════════════════════════╬

    struct Resources {
        uint64 credits;   // primary currency — produced by Credits Forge
        uint64 biomass;   // organic resource — produced by Biomass Farm
        uint64 minera;    // rare mineral    — produced by Minera Extractor
        uint64 vanguard;  // troops          — produced by Vanguard Barracks
        uint40 lastTickAt;
        uint64 vaultCredits;  // protected portion — cannot be looted
        uint64 vaultBiomass;
        uint64 vaultMinera;
    }

    struct ProductionRates {
        uint64 creditsPerTick;
        uint64 biomassPerTick;
        uint64 mineraPerTick;
        uint64 vanguardPerTick;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ NEURAL STORAGE
    // ╬════════════════════════════════════════════════════════════════╬

    mapping(address => Resources)       public vaults;
    mapping(address => ProductionRates) public productionRates;

    address public baseContract;
    address public pvpArena;
    address public owner;

    // Tick configuration
    uint40  public constant TICK_INTERVAL      = 30;    // seconds
    uint64  public constant BASE_CREDITS_RATE  = 15;
    uint64  public constant BASE_BIOMASS_RATE  = 10;
    uint64  public constant BASE_MINERA_RATE   = 5;
    uint64  public constant BASE_VANGUARD_RATE = 2;

    // Resource caps — prevent overflow
    uint64  public constant MAX_CREDITS        = 10_000_000;
    uint64  public constant MAX_BIOMASS        = 5_000_000;
    uint64  public constant MAX_MINERA         = 2_000_000;
    uint64  public constant MAX_VANGUARD       = 500_000;

    // Vault protection — percentage protected from raids
    uint8   public constant VAULT_PROTECT_PCT  = 20;   // 20% always safe

    // Loot percentage per raid win
    uint8   public constant LOOT_PCT           = 15;   // 15% of lootable resources

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ REACTIVITY FEED: SOMNIA EMISSIONS
    // ╬════════════════════════════════════════════════════════════════╬

    event ResourceUpdated(
        address indexed player,
        uint64  credits,
        uint64  biomass,
        uint64  minera,
        uint64  vanguard,
        uint40  timestamp
    );

    event ResourcesCollected(
        address indexed player,
        uint64  creditsGained,
        uint64  biomassGained,
        uint64  mineraGained,
        uint64  vanguardGained,
        uint40  timestamp
    );

    event LootTransferred(
        address indexed attacker,
        address indexed defender,
        uint64  creditsLooted,
        uint64  biomassLooted,
        uint64  mineraLooted,
        uint256 indexed battleId
    );

    event ProductionRateUpdated(
        address indexed player,
        uint64  creditsPerTick,
        uint64  biomassPerTick,
        uint64  mineraPerTick,
        uint64  vanguardPerTick
    );

    event VaultDeposited(
        address indexed player,
        uint64  creditsVaulted,
        uint64  biomassVaulted,
        uint64  mineraVaulted
    );

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ PROTOCOL EXCEPTIONS
    // ╬════════════════════════════════════════════════════════════════╬

    error NotInitialized();
    error OnlyArena();
    error OnlyOwner();
    error OnlyBaseContract();
    error InsufficientResources();
    error CooldownActive();

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ CORE INITIALIZATION
    // ╬════════════════════════════════════════════════════════════════╬

    constructor() {
        baseContract = 0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66;
        owner        = msg.sender;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ COMMAND UPLINK: ADMINISTRATIVE
    // ╬════════════════════════════════════════════════════════════════╬

    function setPvPArena(address _arena) external {
        if (msg.sender != owner) revert OnlyOwner();
        pvpArena = _arena;
    }

    function setBaseContract(address _base) external {
        if (msg.sender != owner) revert OnlyOwner();
        baseContract = _base;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ INITIALIZATION SEQUENCES
    // ╬════════════════════════════════════════════════════════════════╬

    /// @notice Initialize resource vault for a new player
    /// @dev Called by BaseContract when initializeBase() is called
    function initializeVault(address player) external {
        require(
            msg.sender == baseContract || msg.sender == owner,
            "Not authorized"
        );

        vaults[player] = Resources({
            credits:       500,
            biomass:       300,
            minera:        150,
            vanguard:      100,
            lastTickAt:    uint40(block.timestamp),
            vaultCredits:  0,
            vaultBiomass:  0,
            vaultMinera:   0
        });

        productionRates[player] = ProductionRates({
            creditsPerTick:  BASE_CREDITS_RATE,
            biomassPerTick:  BASE_BIOMASS_RATE,
            mineraPerTick:   BASE_MINERA_RATE,
            vanguardPerTick: BASE_VANGUARD_RATE
        });

        emit ResourceUpdated(
            player, 500, 300, 150, 100,
            uint40(block.timestamp)
        );
    }

    function emergencySeed(address player) external {
        require(msg.sender == owner, "Not owner");
        vaults[player] = Resources({
            credits:      500,
            biomass:      300,
            minera:       150,
            vanguard:     100,
            lastTickAt:   uint40(block.timestamp),
            vaultCredits: 0,
            vaultBiomass: 0,
            vaultMinera:  0
        });
        productionRates[player] = ProductionRates({
            creditsPerTick:  BASE_CREDITS_RATE,
            biomassPerTick:  BASE_BIOMASS_RATE,
            mineraPerTick:   BASE_MINERA_RATE,
            vanguardPerTick: BASE_VANGUARD_RATE
        });
        emit ResourceUpdated(
            player, 500, 300, 150, 100,
            uint40(block.timestamp)
        );
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ ECONOMIC ENGAGEMENT
    // ╬════════════════════════════════════════════════════════════════╬

    /// @notice Collect accumulated resources since last tick
    /// @dev Callable by the player.
    function collectResources() external {
        _collectResourcesFor(msg.sender);
    }

    /// @notice Collect resources for a specific player (called by BaseContract)
    function collectResourcesFor(address player) external {
        if (msg.sender != baseContract) revert OnlyBaseContract();
        _collectResourcesFor(player);
    }

    function _collectResourcesFor(address player) internal {
        Resources storage res = vaults[player];
        if (res.lastTickAt == 0) revert NotInitialized();

        uint40 now_     = uint40(block.timestamp);
        uint40 elapsed  = now_ - res.lastTickAt;
        if (elapsed < TICK_INTERVAL) return; // Silent return for auto-ticking

        uint40 ticks    = elapsed / TICK_INTERVAL;
        ProductionRates storage rates = productionRates[player];

        uint64 creditsGained  = rates.creditsPerTick  * ticks;
        uint64 biomassGained  = rates.biomassPerTick  * ticks;
        uint64 mineraGained   = rates.mineraPerTick   * ticks;
        uint64 vanguardGained = rates.vanguardPerTick * ticks;

        // Apply gains with caps
        res.credits  = _capAdd(res.credits,  creditsGained,  MAX_CREDITS);
        res.biomass  = _capAdd(res.biomass,  biomassGained,  MAX_BIOMASS);
        res.minera   = _capAdd(res.minera,   mineraGained,   MAX_MINERA);
        res.vanguard = _capAdd(res.vanguard, vanguardGained, MAX_VANGUARD);
        res.lastTickAt = now_;

        // Auto-vault 20% of total resources for protection
        _autoVault(player);

        emit ResourcesCollected(
            player,
            creditsGained,
            biomassGained,
            mineraGained,
            vanguardGained,
            now_
        );

        // This event is what Somnia Reactivity subscribes to
        emit ResourceUpdated(
            player,
            res.credits,
            res.biomass,
            res.minera,
            res.vanguard,
            now_
        );
    }

    /// @notice Deduct resources for building/upgrading
    /// @dev Called by BaseContract when player starts upgrade
    function deductForUpgrade(
        address player,
        uint64  creditsCost,
        uint64  biomassCost,
        uint64  mineraCost
    ) external {
        if (msg.sender != baseContract) revert OnlyBaseContract();

        // Settle resources first
        _collectResourcesFor(player);

        Resources storage res = vaults[player];
        if (res.credits < creditsCost ||
            res.biomass < biomassCost ||
            res.minera  < mineraCost)
        {
            revert InsufficientResources();
        }

        res.credits -= creditsCost;
        res.biomass -= biomassCost;
        res.minera  -= mineraCost;

        emit ResourceUpdated(
            player,
            res.credits,
            res.biomass,
            res.minera,
            res.vanguard,
            uint40(block.timestamp)
        );
    }

    /// @notice Transfer loot from loser to winner after a raid
    /// @dev Only callable by PvPArena contract
    function transferLoot(
        address attacker,
        address defender,
        uint256 battleId,
        uint8   lootPct
    ) external returns (
        uint64 creditsLooted,
        uint64 biomassLooted,
        uint64 mineraLooted
    ) {
        if (msg.sender != pvpArena) revert OnlyArena();

        // Settle resources for both parties before processing loot
        _collectResourcesFor(attacker);
        _collectResourcesFor(defender);

        Resources storage defRes = vaults[defender];
        Resources storage atkRes = vaults[attacker];

        // Calculate lootable amount (total minus vaulted)
        uint64 lootableCredits = defRes.credits > defRes.vaultCredits
            ? defRes.credits - defRes.vaultCredits : 0;
        uint64 lootableBiomass = defRes.biomass > defRes.vaultBiomass
            ? defRes.biomass - defRes.vaultBiomass : 0;
        uint64 lootableMinera  = defRes.minera  > defRes.vaultMinera
            ? defRes.minera  - defRes.vaultMinera  : 0;

        // Take lootPct of lootable resources
        creditsLooted = (lootableCredits * uint64(lootPct)) / 100;
        biomassLooted = (lootableBiomass * uint64(lootPct)) / 100;
        mineraLooted  = (lootableMinera  * uint64(lootPct)) / 100;

        // Transfer
        defRes.credits -= creditsLooted;
        defRes.biomass -= biomassLooted;
        defRes.minera  -= mineraLooted;

        atkRes.credits = _capAdd(atkRes.credits, creditsLooted, MAX_CREDITS);
        atkRes.biomass = _capAdd(atkRes.biomass, biomassLooted, MAX_BIOMASS);
        atkRes.minera  = _capAdd(atkRes.minera,  mineraLooted,  MAX_MINERA);

        // Emit for both players — Reactivity pushes to both screens
        emit ResourceUpdated(
            defender,
            defRes.credits,
            defRes.biomass,
            defRes.minera,
            defRes.vanguard,
            uint40(block.timestamp)
        );

        emit ResourceUpdated(
            attacker,
            atkRes.credits,
            atkRes.biomass,
            atkRes.minera,
            atkRes.vanguard,
            uint40(block.timestamp)
        );

        emit LootTransferred(
            attacker,
            defender,
            creditsLooted,
            biomassLooted,
            mineraLooted,
            battleId
        );
    }

    /// @notice Update production rates when buildings are upgraded
    /// @dev Called by BaseContract after recalculating stats
    function updateProductionRates(
        address player,
        uint64  creditsPerTick,
        uint64  biomassPerTick,
        uint64  mineraPerTick,
        uint64  vanguardPerTick
    ) external {
        if (msg.sender != baseContract) revert OnlyBaseContract();

        productionRates[player] = ProductionRates({
            creditsPerTick:  creditsPerTick,
            biomassPerTick:  biomassPerTick,
            mineraPerTick:   mineraPerTick,
            vanguardPerTick: vanguardPerTick
        });

        emit ProductionRateUpdated(
            player,
            creditsPerTick,
            biomassPerTick,
            mineraPerTick,
            vanguardPerTick
        );
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ TACTICAL INTEL: READ OPERATIONS
    // ╬════════════════════════════════════════════════════════════════╬

    function getResources(address player)
        external view
        returns (Resources memory)
    {
        return vaults[player];
    }

    function getProductionRates(address player)
        external view
        returns (ProductionRates memory)
    {
        return productionRates[player];
    }

    /// @notice Preview how much would be collected if collected now
    function previewCollection(address player)
        external view
        returns (
            uint64 credits,
            uint64 biomass,
            uint64 minera,
            uint64 vanguard
        )
    {
        Resources storage res   = vaults[player];
        ProductionRates storage rates = productionRates[player];

        uint40 elapsed = uint40(block.timestamp) - res.lastTickAt;
        if (elapsed < TICK_INTERVAL) return (0, 0, 0, 0);

        uint40 ticks = elapsed / TICK_INTERVAL;
        credits  = rates.creditsPerTick  * ticks;
        biomass  = rates.biomassPerTick  * ticks;
        minera   = rates.mineraPerTick   * ticks;
        vanguard = rates.vanguardPerTick * ticks;
    }

    /// @notice Get total lootable resources (unprotected portion)
    function getLootableResources(address player)
        external view
        returns (
            uint64 lootableCredits,
            uint64 lootableBiomass,
            uint64 lootableMinera
        )
    {
        Resources storage res = vaults[player];
        lootableCredits = res.credits > res.vaultCredits
            ? res.credits - res.vaultCredits : 0;
        lootableBiomass = res.biomass > res.vaultBiomass
            ? res.biomass - res.vaultBiomass : 0;
        lootableMinera  = res.minera  > res.vaultMinera
            ? res.minera  - res.vaultMinera  : 0;
    }

    function isInitialized(address player)
        external view
        returns (bool)
    {
        return vaults[player].lastTickAt > 0;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ INTERNAL HEURISTICS
    // ╬════════════════════════════════════════════════════════════════╬

    function _capAdd(
        uint64 current,
        uint64 amount,
        uint64 cap
    ) internal pure returns (uint64) {
        uint64 result = current + amount;
        return result > cap ? cap : result;
    }

    /// @notice Auto-vault VAULT_PROTECT_PCT of current resources
    function _autoVault(address player) internal {
        Resources storage res = vaults[player];

        res.vaultCredits = (res.credits * VAULT_PROTECT_PCT) / 100;
        res.vaultBiomass = (res.biomass * VAULT_PROTECT_PCT) / 100;
        res.vaultMinera  = (res.minera  * VAULT_PROTECT_PCT) / 100;

        emit VaultDeposited(
            player,
            res.vaultCredits,
            res.vaultBiomass,
            res.vaultMinera
        );
    }
}
