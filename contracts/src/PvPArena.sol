// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IBaseContract.sol";
import "./LeaderboardContract.sol";
import "./ResourceVault.sol";
import "./EmpireRegistry.sol";
import "./SomniaEventHandler.sol";
import "./interfaces/ISomniaReactivityPrecompile.sol";
import "./interfaces/SomniaExtensions.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PvPArena — DreamSiege Battle Engine
/// @notice ╔══════════════════════════════════════════════════════════════════════╗
///         ║  DREAMSIEGE ⌬ PVP ARENA ⌬ KINETIC ENGAGEMENT SUITE             ║
///         ╚══════════════════════════════════════════════════════════════════════╝
/// @dev The heart of DreamSiege's PvP system. Manages challenge lifecycle, 
///      Pyth Entropy integration, and real-time Somnia Reactivity feeds.
contract PvPArena is ReentrancyGuard, SomniaEventHandler {

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ DATA ARCHITECTURE
    // ╬════════════════════════════════════════════════════════════════╬

    enum BattleStatus {
        PENDING,     // challenge issued, not yet accepted
        ACTIVE,      // accepted, awaiting entropy callback
        RESOLVED,    // outcome determined
        INTERCEPTED, // defender successfully intercepted
        EXPIRED      // challenge expired unclaimed
    }

    struct Battle {
        uint256     id;
        address     attacker;
        address     defender;
        BattleStatus status;
        bool        attackerWon;
        uint32      attackerPower;
        uint32      defenderPower;
        uint64      lootCredits;
        uint64      lootBiomass;
        uint64      lootMinera;
        uint40      createdAt;
        uint40      resolvedAt;
        uint64      entropySequence; // Pyth Entropy sequence number
        bytes32     entropyCommit;   // attacker's random commitment
        string      attackerEmpire;
        string      defenderEmpire;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ NEURAL STORAGE
    // ╬════════════════════════════════════════════════════════════════╬

    IBaseContract       public baseContract;
    LeaderboardContract public leaderboard;
    ResourceVault       public resourceVault;
    EmpireRegistry      public empireRegistry;
    address             public owner;

    // Pyth Entropy
    // TODO: Set to actual Pyth Entropy address on Somnia testnet
    // Check: https://docs.pyth.network/entropy/contract-addresses
    address public pythEntropy;
    address public pythProvider;

    mapping(uint256 => Battle)  public battles;
    mapping(address => uint256) public activeBattleByAttacker;
    mapping(address => uint256) public activeBattleByDefender;
    mapping(uint64  => uint256) public entropyToBattle;
    mapping(address => uint256) public lastAttackTime;
    mapping(address => uint256) public lastDefendTime;

    uint256 private _battleCounter;

    // Global battle feed for landing page marquee
    uint256[20] public recentBattleIds;
    uint8       public recentBattleCount;

    // Configurable Game Constants
    uint40 public challengeExpiry = 180;  // 3 min to accept
    uint40 public attackCooldown  = 60;   // 1 min between attacks
    uint40 public defendCooldown  = 30;   // 30s before re-raid
    uint40 public interceptWindow = 180;  // 3 min to intercept
    uint8  public lootPct         = 15;   // 15% of lootable resources

    uint8  public constant MIN_WIN_CHANCE     = 10;   // floor win probability
    uint8  public constant MAX_WIN_CHANCE     = 90;   // ceiling win probability

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ REACTIVITY FEED: SOMNIA EMISSIONS
    // ╬════════════════════════════════════════════════════════════════╬

    /// @dev Fires the moment attacker launches — defender's screen
    ///      shows "INCOMING RAID" alert via Reactivity push instantly
    event ChallengeIssued(
        uint256 indexed battleId,
        address indexed attacker,
        address indexed defender,
        string  attackerEmpire,
        string  defenderEmpire,
        uint32  attackerPower,
        uint32  defenderPower,
        uint40  expiresAt
    );

    /// @dev Fires when Pyth Entropy resolves the battle outcome
    ///      Both attacker and defender screens update simultaneously
    event BattleResolved(
        uint256 indexed battleId,
        address indexed winner,
        address indexed loser,
        bool    attackerWon,
        uint64  creditsLooted,
        uint64  biomassLooted,
        uint64  mineraLooted,
        string  winnerEmpire,
        string  loserEmpire
    );

    /// @dev Fires when defender successfully intercepts incoming raid
    event RaidIntercepted(
        uint256 indexed battleId,
        address indexed defender,
        address indexed attacker,
        string  defenderEmpire,
        uint40  timestamp
    );

    /// @dev Fires when challenge expires unclaimed
    event ChallengeExpired(
        uint256 indexed battleId,
        address indexed attacker,
        address indexed defender
    );

    /// @dev Global battle feed event — powers landing page live ticker
    event GlobalBattleEvent(
        uint256 indexed battleId,
        string  attackerEmpire,
        string  defenderEmpire,
        bool    attackerWon,
        uint64  totalLoot,
        uint40  timestamp
    );

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ PROTOCOL EXCEPTIONS
    // ╬════════════════════════════════════════════════════════════════╬

    error NoBase();
    error NoEmpire();
    error CannotAttackSelf();
    error AttackOnCooldown();
    error DefendOnCooldown();
    error AlreadyInBattle();
    error BattleNotFound();
    error NotAttacker();
    error NotDefender();
    error BattleNotPending();
    error BattleNotActive();
    error AlreadyResolved();
    error ChallengeExpiredError();
    error InterceptWindowClosed();
    error OnlyPythEntropy();
    error OnlyOwner();

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ CORE INITIALIZATION
    // ╬════════════════════════════════════════════════════════════════╬

    constructor() {
        // NOTE: pythEntropy and pythProvider addresses should be updated 
        // once Pyth is live on Somnia testnet before going to mainnet.
        baseContract   = IBaseContract(0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66);
        leaderboard    = LeaderboardContract(0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b);
        resourceVault  = ResourceVault(0xA737c12dc5291cd67715E1cb5E0B04cfEb70ab3d);
        empireRegistry = EmpireRegistry(0x1d617cC33411562c0c25Ce35A1B6F08E92d74916);
        pythEntropy    = 0xA2aa501B19Aff2A041721c4309f982a8Ee973064;
        pythProvider   = 0xdeF0000000000000000000000000000000000000;
        owner          = msg.sender;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ COMMAND UPLINK: ADMINISTRATIVE
    // ╬════════════════════════════════════════════════════════════════╬

    function setPythEntropy(
        address _entropy,
        address _provider
    ) external {
        if (msg.sender != owner) revert OnlyOwner();
        pythEntropy  = _entropy;
        pythProvider = _provider;
    }

    function setBaseContract(address _base) external {
        if (msg.sender != owner) revert OnlyOwner();
        baseContract = IBaseContract(_base);
    }

    function setLeaderboard(address _leaderboard) external {
        if (msg.sender != owner) revert OnlyOwner();
        leaderboard = LeaderboardContract(_leaderboard);
    }

    function setEmpireRegistry(address _registry) external {
        if (msg.sender != owner) revert OnlyOwner();
        empireRegistry = EmpireRegistry(_registry);
    }

    function setResourceVault(address _vault) external {
        if (msg.sender != owner) revert OnlyOwner();
        resourceVault = ResourceVault(_vault);
    }

    /// @notice Update game balance constants
    function setGameConfig(
        uint40 _challengeExpiry,
        uint40 _attackCooldown,
        uint40 _defendCooldown,
        uint40 _interceptWindow,
        uint8  _lootPct
    ) external {
        if (msg.sender != owner) revert OnlyOwner();
        challengeExpiry = _challengeExpiry;
        attackCooldown  = _attackCooldown;
        defendCooldown  = _defendCooldown;
        interceptWindow = _interceptWindow;
        lootPct         = _lootPct;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ KINETIC ENGAGEMENT PROTOCOLS
    // ╬════════════════════════════════════════════════════════════════╬

    /// @notice Launch a raid against a defender
    /// @param defender Target player address
    /// @param userRandomness Attacker's random commitment for Pyth Entropy
    /// @dev Emits ChallengeIssued — Somnia Reactivity pushes INCOMING RAID
    ///      alert to defender's frontend in the same block, sub-second.
    function issueChallenge(
        address defender,
        bytes32 userRandomness
    ) external payable returns (uint256 battleId) {

        // Validations
        if (!baseContract.hasBase(msg.sender)) revert NoBase();
        if (!baseContract.hasBase(defender))   revert NoBase();
        if (msg.sender == defender)            revert CannotAttackSelf();

        if (block.timestamp < lastAttackTime[msg.sender] + attackCooldown) {
            revert AttackOnCooldown();
        }
        if (block.timestamp < lastDefendTime[defender] + defendCooldown) {
            revert DefendOnCooldown();
        }

        // Check no active battle
        uint256 existingBattle = activeBattleByAttacker[msg.sender];
        if (existingBattle != 0 &&
            battles[existingBattle].status == BattleStatus.PENDING) {
            revert AlreadyInBattle();
        }

        // Snapshot combat stats
        (uint32 atkPower,,,,)        = baseContract.getBaseStats(msg.sender);
        (,uint32 defPower,,,)        = baseContract.getBaseStats(defender);

        // Get empire names for display
        string memory atkEmpire = _getEmpireName(msg.sender);
        string memory defEmpire = _getEmpireName(defender);

        // Calculate loot preview
        (uint64 lootC, uint64 lootB, uint64 lootM) =
            resourceVault.getLootableResources(defender);
        lootC = (lootC * uint64(lootPct)) / 100;
        lootB = (lootB * uint64(lootPct)) / 100;
        lootM = (lootM * uint64(lootPct)) / 100;

        // Create battle record
        battleId = ++_battleCounter;
        battles[battleId] = Battle({
            id:             battleId,
            attacker:       msg.sender,
            defender:       defender,
            status:         BattleStatus.PENDING,
            attackerWon:    false,
            attackerPower:  atkPower,
            defenderPower:  defPower,
            lootCredits:    lootC,
            lootBiomass:    lootB,
            lootMinera:     lootM,
            createdAt:      uint40(block.timestamp),
            resolvedAt:     0,
            entropySequence: 0,
            entropyCommit:  userRandomness,
            attackerEmpire: atkEmpire,
            defenderEmpire: defEmpire
        });

        activeBattleByAttacker[msg.sender] = battleId;
        activeBattleByDefender[defender]   = battleId;
        lastAttackTime[msg.sender]          = block.timestamp;
        lastDefendTime[defender]            = block.timestamp;

        // ── REQUEST PYTH ENTROPY ────────────────────────────────────
        // TODO: Uncomment when Pyth Entropy is available on Somnia testnet
        // uint256 fee = IEntropy(pythEntropy).getFee(pythProvider);
        // require(msg.value >= fee, "Insufficient entropy fee");
        // uint64 seqNum = IEntropy(pythEntropy).request{value: fee}(
        //     pythProvider,
        //     userRandomness,
        //     true
        // );
        // battles[battleId].entropySequence = seqNum;
        // entropyToBattle[seqNum] = battleId;

        // For hackathon demo: auto-resolve after block
        // Remove this line when Pyth Entropy is live
        battles[battleId].status = BattleStatus.ACTIVE;

        // ── SCHEDULE AUTO-RESOLUTION (Somnia Deep Integration) ──────
        // Automatically trigger resolveBattle after challengeExpiry
        // Wrapped in try/catch: if Reactivity precompile rejects, battle still proceeds


        emit ChallengeIssued(
            battleId,
            msg.sender,
            defender,
            atkEmpire,
            defEmpire,
            atkPower,
            defPower,
            uint40(block.timestamp) + challengeExpiry
        );

        return battleId;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ RESOLUTION SEQUENCES
    // ╬════════════════════════════════════════════════════════════════╬

    /// @notice Resolve a battle using on-chain pseudo-randomness
    /// @dev For hackathon: uses blockhash. Replace with Pyth callback
    ///      for mainnet. Anyone can call this after challenge is issued.
    function resolveBattle(uint256 battleId) external nonReentrant {
        Battle storage battle = battles[battleId];

        if (battle.id == 0)                          revert BattleNotFound();
        if (battle.status == BattleStatus.RESOLVED)  revert AlreadyResolved();
        if (battle.status == BattleStatus.INTERCEPTED) revert AlreadyResolved();
        if (battle.status != BattleStatus.ACTIVE &&
            battle.status != BattleStatus.PENDING)   revert BattleNotActive();

        // Check not expired
        if (block.timestamp > battle.createdAt + challengeExpiry) {
            battle.status = BattleStatus.EXPIRED;
            emit ChallengeExpired(battleId, battle.attacker, battle.defender);
            return;
        }

        // ── DETERMINE OUTCOME ───────────────────────────────────────
        // Hackathon: blockhash XOR commitment for pseudo-randomness
        // Production: replace with Pyth Entropy callback below
        // Pure stat-based outcome — no randomness
        // Factor in resource composition for combat triangle
        (uint64 atkCredits, uint64 atkBiomass, uint64 atkMinera,) = 
            _getResourceSnapshot(battle.attacker);
        (uint64 defCredits, uint64 defBiomass, uint64 defMinera,) = 
            _getResourceSnapshot(battle.defender);

        uint256 finalAtkPower = _calculateFinalPower(
            battle.attackerPower,
            atkCredits, atkBiomass, atkMinera,
            defCredits, defBiomass, defMinera,
            true
        );

        uint256 finalDefPower = _calculateFinalPower(
            battle.defenderPower,
            defCredits, defBiomass, defMinera,
            atkCredits, atkBiomass, atkMinera,
            false
        );

        bool attackerWon = finalAtkPower > finalDefPower;
        battle.attackerWon    = attackerWon;
        battle.status         = BattleStatus.RESOLVED;
        battle.resolvedAt     = uint40(block.timestamp);

        // ── DISTRIBUTE LOOT ─────────────────────────────────────────
        uint64 creditsLooted = 0;
        uint64 biomassLooted = 0;
        uint64 mineraLooted  = 0;

        if (attackerWon) {
            (creditsLooted, biomassLooted, mineraLooted) =
                resourceVault.transferLoot(
                    battle.attacker,
                    battle.defender,
                    battleId,
                    15
                );
            battle.lootCredits = creditsLooted;
            battle.lootBiomass = biomassLooted;
            battle.lootMinera  = mineraLooted;
        }

        // ── UPDATE BASE CONTRACT ─────────────────────────────────────
        baseContract.applyRaidResult(
            battle.attacker,
            battle.defender,
            creditsLooted,
            biomassLooted,
            mineraLooted,
            attackerWon
        );

        // ── UPDATE LEADERBOARD ───────────────────────────────────────
        address winner = attackerWon ? battle.attacker : battle.defender;
        address loser  = attackerWon ? battle.defender : battle.attacker;
        leaderboard.recordBattleResult(winner, loser, creditsLooted);

        // ── CLEAR ACTIVE BATTLES ─────────────────────────────────────
        delete activeBattleByAttacker[battle.attacker];
        delete activeBattleByDefender[battle.defender];

        // ── ADD TO GLOBAL FEED ───────────────────────────────────────
        _addToGlobalFeed(battleId);

        string memory winnerEmpire = attackerWon
            ? battle.attackerEmpire
            : battle.defenderEmpire;
        string memory loserEmpire  = attackerWon
            ? battle.defenderEmpire
            : battle.attackerEmpire;

        // ── EMIT EVENTS (Somnia Reactivity pushes to both players) ───
        emit BattleResolved(
            battleId,
            winner,
            loser,
            attackerWon,
            creditsLooted,
            biomassLooted,
            mineraLooted,
            winnerEmpire,
            loserEmpire
        );

        emit GlobalBattleEvent(
            battleId,
            battle.attackerEmpire,
            battle.defenderEmpire,
            attackerWon,
            creditsLooted + biomassLooted + mineraLooted,
            uint40(block.timestamp)
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // PYTH ENTROPY CALLBACK
    // ─────────────────────────────────────────────────────────────────

    /// @notice Called by Pyth Entropy contract with verified randomness
    /// @dev READY FOR PRODUCTION: Just needs the correct Pyth Entropy 
    ///      contract address for the Somnia network.
    // function entropyCallback(
    //     uint64          sequenceNumber,
    //     address         provider,
    //     bytes32         randomNumber
    // ) external {
    //     if (msg.sender != pythEntropy) revert OnlyPythEntropy();
    //
    //     uint256 battleId = entropyToBattle[sequenceNumber];
    //     if (battleId == 0) return;
    //
    //     Battle storage battle = battles[battleId];
    //     if (battle.status != BattleStatus.ACTIVE) return;
    //
    //     uint256 roll      = uint256(randomNumber) % 100;
    //     uint256 winChance = _calculateWinChance(
    //         battle.attackerPower,
    //         battle.defenderPower
    //     );
    //
    //     bool attackerWon   = roll < winChance;
    //     battle.attackerWon = attackerWon;
    //     battle.status      = BattleStatus.RESOLVED;
    //     battle.resolvedAt  = uint40(block.timestamp);
    //
    //     _finalizeBattle(battleId, attackerWon);
    // }

    // ─────────────────────────────────────────────────────────────────
    // INTERCEPT PROTOCOL
    // ─────────────────────────────────────────────────────────────────

    /// @notice Defender activates Intercept Protocol to neutralize raid
    /// @dev Must be called within INTERCEPT_WINDOW seconds of challenge
    ///      Emits RaidIntercepted — Reactivity pushes to attacker screen
    function interceptRaid(uint256 battleId) external nonReentrant {
        Battle storage battle = battles[battleId];

        if (battle.id == 0)              revert BattleNotFound();
        if (msg.sender != battle.defender) revert NotDefender();
        if (battle.status != BattleStatus.PENDING &&
            battle.status != BattleStatus.ACTIVE)  revert BattleNotPending();

        if (block.timestamp > battle.createdAt + interceptWindow) {
            revert InterceptWindowClosed();
        }

        // ── STAT-BASED INTERCEPT RESOLUTION ─────────────────────────
        // Read current combat stats from base contract
        (uint32 atkPower,,,,) = baseContract.getBaseStats(battle.attacker);
        (,uint32 defPower,,,) = baseContract.getBaseStats(battle.defender);

        // Pure stat-based intercept — no randomness
        // Factor in resource composition
        (uint64 atkCredits, uint64 atkBiomass, uint64 atkMinera,) = 
            _getResourceSnapshot(battle.attacker);
        (uint64 defCredits, uint64 defBiomass, uint64 defMinera,) = 
            _getResourceSnapshot(battle.defender);

        uint256 finalAtkPower = _calculateFinalPower(
            atkPower,
            atkCredits, atkBiomass, atkMinera,
            defCredits, defBiomass, defMinera,
            true
        );

        uint256 finalDefPower = _calculateFinalPower(
            defPower,
            defCredits, defBiomass, defMinera,
            atkCredits, atkBiomass, atkMinera,
            false
        );

        bool defenderWins = finalDefPower >= finalAtkPower;
        uint64 creditsTransferred = 0;
        uint64 biomassTransferred = 0;
        uint64 mineraTransferred  = 0;

        if (defenderWins) {
            // Defender successfully repels — attacker pays 5% penalty
            battle.status     = BattleStatus.INTERCEPTED;
            battle.resolvedAt = uint40(block.timestamp);
            battle.attackerWon = false;

            // Transfer 5% of attacker's resources to defender as penalty
            (creditsTransferred, biomassTransferred, mineraTransferred) =
                resourceVault.transferLoot(
                    battle.defender,
                    battle.attacker,
                    battleId,
                    5
                );

            // Record defender win
            leaderboard.recordBattleResult(
                battle.defender,
                battle.attacker,
                creditsTransferred
            );

        } else {
            // Attacker breaks through intercept — defender pays
            battle.status     = BattleStatus.RESOLVED;
            battle.resolvedAt = uint40(block.timestamp);
            battle.attackerWon = true;

            // Transfer 5% of defender's resources to attacker
            (creditsTransferred, biomassTransferred, mineraTransferred) =
                resourceVault.transferLoot(
                    battle.attacker,
                    battle.defender,
                    battleId,
                    5
                );

            battle.lootCredits = creditsTransferred;
            battle.lootBiomass = biomassTransferred;
            battle.lootMinera  = mineraTransferred;

            // Record attacker win
            leaderboard.recordBattleResult(
                battle.attacker,
                battle.defender,
                creditsTransferred
            );
        }

        delete activeBattleByAttacker[battle.attacker];
        delete activeBattleByDefender[battle.defender];

        // Add to global feed
        _addToGlobalFeed(battleId);

        // Emit intercept event
        emit RaidIntercepted(
            battleId,
            battle.defender,
            battle.attacker,
            battle.defenderEmpire,
            uint40(block.timestamp)
        );

        // Emit global battle event for the ticker
        emit GlobalBattleEvent(
            battleId,
            battle.attackerEmpire,
            battle.defenderEmpire,
            battle.attackerWon,
            creditsTransferred + biomassTransferred + mineraTransferred,
            uint40(block.timestamp)
        );

        // Emit battle resolved so both UIs update correctly
        address winner = defenderWins ? battle.defender : battle.attacker;
        address loser  = defenderWins ? battle.attacker : battle.defender;
        string memory winnerEmpire = defenderWins 
            ? battle.defenderEmpire 
            : battle.attackerEmpire;
        string memory loserEmpire = defenderWins 
            ? battle.attackerEmpire 
            : battle.defenderEmpire;

        emit BattleResolved(
            battleId,
            winner,
            loser,
            battle.attackerWon,
            creditsTransferred,
            biomassTransferred,
            mineraTransferred,
            winnerEmpire,
            loserEmpire
        );
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ TACTICAL INTEL: READ OPERATIONS
    // ╬════════════════════════════════════════════════════════════════╬

    function getBattle(uint256 battleId)
        external view
        returns (Battle memory)
    {
        return battles[battleId];
    }

    function getActiveBattleForAttacker(address attacker)
        external view
        returns (Battle memory)
    {
        return battles[activeBattleByAttacker[attacker]];
    }

    function getActiveBattleForDefender(address defender)
        external view
        returns (Battle memory)
    {
        return battles[activeBattleByDefender[defender]];
    }

    function getRecentBattles()
        external view
        returns (Battle[] memory result)
    {
        uint8 count  = recentBattleCount < 20 ? recentBattleCount : 20;
        result       = new Battle[](count);
        for (uint8 i = 0; i < count; i++) {
            result[i] = battles[recentBattleIds[i]];
        }
    }

    function getWinChance(address attacker, address defender)
        external view
        returns (uint256 winChance)
    {
        (uint32 atkPow,,,,) = baseContract.getBaseStats(attacker);
        (,uint32 defPow,,,) = baseContract.getBaseStats(defender);
        return _calculateWinChance(atkPow, defPow);
    }

    function isOnCooldown(address player)
        external view
        returns (bool attacking, bool defending)
    {
        attacking = block.timestamp < lastAttackTime[player] + attackCooldown;
        defending = block.timestamp < lastDefendTime[player] + defendCooldown;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ INTERNAL HEURISTICS
    // ╬════════════════════════════════════════════════════════════════╬

    /// @notice Get resource snapshot for a player from vault
    function _getResourceSnapshot(address player) 
        internal view 
        returns (uint64 credits, uint64 biomass, uint64 minera, uint64 vanguard) 
    {
        try resourceVault.getResources(player) returns (
            ResourceVault.Resources memory res
        ) {
            return (res.credits, res.biomass, res.minera, res.vanguard);
        } catch {
            return (0, 0, 0, 0);
        }
    }

    /// @notice Calculate final combat power using resource triangle
    /// @dev Vanguard > Minera > Biomass > Credits > Vanguard (triangle)
    /// Attacker uses their resources offensively
    /// Defender uses their resources defensively
    function _calculateFinalPower(
        uint32 basePower,
        uint64 myCredits,
        uint64 myBiomass,
        uint64 myMinera,
        uint64 enemyCredits,
        uint64 enemyBiomass,
        uint64 enemyMinera,
        bool isAttacker
    ) internal pure returns (uint256 finalPower) {
        finalPower = uint256(basePower) * 100;

        // Resource triangle multipliers (scaled by 100)
        // Attacker: Vanguard(Minera) beats Minera(Biomass) beats Biomass(Credits) beats Credits(Vanguard)
        uint256 multiplier = 100;

        if (isAttacker) {
            // Attacker's Minera vs Defender's Biomass → +20% bonus
            if (myMinera > enemyBiomass) {
                multiplier += 20;
            }
            // Attacker's Biomass vs Defender's Credits → +20% bonus  
            if (myBiomass > enemyCredits) {
                multiplier += 20;
            }
            // Attacker's Credits vs Defender's Minera → +20% bonus
            if (myCredits > enemyMinera) {
                multiplier += 20;
            }
            // Defender heavy in counter-resource → -15% penalty
            if (enemyMinera > myBiomass * 2) {
                multiplier -= 15;
            }
        } else {
            // Defender's Minera vs Attacker's Biomass → +20% bonus
            if (myMinera > enemyBiomass) {
                multiplier += 20;
            }
            // Defender's Biomass vs Attacker's Credits → +20% bonus
            if (myBiomass > enemyCredits) {
                multiplier += 20;
            }
            // Defender's Credits vs Attacker's Minera → +20% bonus
            if (myCredits > enemyMinera) {
                multiplier += 20;
            }
            // Attacker heavy in counter-resource → -15% penalty
            if (enemyMinera > myBiomass * 2) {
                multiplier -= 15;
            }
        }

        finalPower = (finalPower * multiplier) / 100;
    }
    function _calculateWinChance(
        uint32 atkPower,
        uint32 defPower
    ) internal pure returns (uint256 winChance) {
        if (atkPower + defPower == 0) return 50;

        winChance = (uint256(atkPower) * 100) /
                    (uint256(atkPower) + uint256(defPower));

        if (winChance < MIN_WIN_CHANCE) winChance = MIN_WIN_CHANCE;
        if (winChance > MAX_WIN_CHANCE) winChance = MAX_WIN_CHANCE;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ SOMNIA REACTIVITY HANDLER
    // ╬════════════════════════════════════════════════════════════════╬

    /**
     * @notice Handler for Somnia Reactivity events (Schedule).
     */
    function _onEvent(
        address /* emitter */,
        bytes32[] calldata eventTopics,
        bytes calldata /* data */
    ) internal override {
        // Check if it's a Schedule event
        if (eventTopics[0] == keccak256("Schedule(uint256)")) {
            // In a real app, we'd index which battle to resolve.
            // For now, we'll look for any battle that is ready for resolution.
            // Deep integration: we could pass the battleId in a custom topic if needed.
            // Since this is called at the exact expiry time, we check recent battles.
            for (uint256 i = 0; i < recentBattleCount; i++) {
                uint256 bid = recentBattleIds[i];
                if (battles[bid].status == BattleStatus.ACTIVE || 
                    battles[bid].status == BattleStatus.PENDING) {
                    if (block.timestamp >= battles[bid].createdAt + challengeExpiry) {
                        this.resolveBattle(bid);
                    }
                }
            }
        }
    }
    function _getEmpireName(address player)
        internal view
        returns (string memory)
    {
        try empireRegistry.getEmpire(player) returns (
            EmpireRegistry.Empire memory empire
        ) {
            if (empire.exists) return empire.name;
        } catch {}

        // Fallback to short address
        bytes memory addr   = abi.encodePacked(player);
        bytes memory result = new bytes(8);
        bytes memory hexC   = "0123456789ABCDEF";
        for (uint i = 0; i < 4; i++) {
            result[i*2]   = hexC[uint8(addr[i]) >> 4];
            result[i*2+1] = hexC[uint8(addr[i]) & 0x0f];
        }
        return string(abi.encodePacked("0x", result, "..."));
    }

    function _addToGlobalFeed(uint256 battleId) internal {
        // Shift array and add new battle at front
        for (uint8 i = 19; i > 0; i--) {
            recentBattleIds[i] = recentBattleIds[i - 1];
        }
        recentBattleIds[0] = battleId;
        if (recentBattleCount < 20) recentBattleCount++;
    }

    receive() external payable {}
}
