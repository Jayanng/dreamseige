// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./LeaderboardContract.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RewardsDistributor — DreamSiege Session & Cycle Rewards
/// @notice ╔══════════════════════════════════════════════════════════════════════╗
///         ║  DREAMSIEGE ⌬ REWARDS DISTRIBUTOR ⌬ LOGISTICS SUITE             ║
///         ╚══════════════════════════════════════════════════════════════════════╝
/// @dev Distributes SOMI token rewards for sessions and weekly cycles.
///      Real-time reward pushes via Somnia Reactivity SDK.
contract RewardsDistributor is ReentrancyGuard {

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ DATA ARCHITECTURE
    // ╬════════════════════════════════════════════════════════════════╬

    enum RewardType {
        SESSION,      // earned during active play session
        CYCLE,        // weekly leaderboard cycle reward
        STREAK,       // win streak bonus
        FIRST_BLOOD,  // first raid of the day bonus
        LEGEND        // top 3 leaderboard bonus
    }

    struct Reward {
        address     player;
        uint256     amount;
        RewardType  rewardType;
        uint40      earnedAt;
        bool        claimed;
    }

    struct PlayerRewardState {
        uint256 totalEarned;
        uint256 totalClaimed;
        uint256 pendingAmount;
        uint40  lastSessionAt;
        uint40  lastCycleClaimAt;
        uint32  sessionRaidsToday;
        bool    firstBloodToday;
    }

    struct CycleInfo {
        uint256 cycleId;
        uint40  startedAt;
        uint40  endsAt;
        uint256 prizePool;
        bool    distributed;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ NEURAL STORAGE
    // ╬════════════════════════════════════════════════════════════════╬

    LeaderboardContract public leaderboard;
    address             public pvpArena;
    address             public owner;

    mapping(address => PlayerRewardState) public playerStates;
    mapping(uint256 => Reward)            public rewards;
    mapping(address => uint256[])         public playerRewardIds;

    CycleInfo public currentCycle;
    uint256   private _rewardCounter;

    // Reward amounts (in wei — adjust for actual SOMI decimals)
    uint256 public constant SESSION_REWARD_PER_WIN  = 0.001 ether;
    uint256 public constant STREAK_BONUS_MULTIPLIER = 0.0005 ether;
    uint256 public constant FIRST_BLOOD_BONUS       = 0.005 ether;
    uint256 public constant CYCLE_DURATION          = 7 days;

    // Cycle prize distribution percentages
    uint8 public constant RANK1_PCT = 30;
    uint8 public constant RANK2_PCT = 20;
    uint8 public constant RANK3_PCT = 15;
    uint8 public constant RANK4_10_PCT = 25; // split between ranks 4-10
    uint8 public constant REMAINING_PCT = 10; // all other participants

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ REACTIVITY FEED: SOMNIA EMISSIONS
    // ╬════════════════════════════════════════════════════════════════╬

    event RewardEarned(
        address indexed player,
        uint256 indexed rewardId,
        uint256 amount,
        RewardType rewardType,
        string  empireName,
        uint40  timestamp
    );

    event RewardClaimed(
        address indexed player,
        uint256 totalAmount,
        uint40  timestamp
    );

    event CycleStarted(
        uint256 indexed cycleId,
        uint256 prizePool,
        uint40  endsAt
    );

    event CycleDistributed(
        uint256 indexed cycleId,
        address rank1,
        address rank2,
        address rank3,
        uint256 totalDistributed
    );

    event StreakBonusEarned(
        address indexed player,
        uint32  streak,
        uint256 bonusAmount,
        string  empireName
    );

    event FirstBloodBonus(
        address indexed player,
        string  empireName,
        uint40  timestamp
    );

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ PROTOCOL EXCEPTIONS
    // ╬════════════════════════════════════════════════════════════════╬

    error OnlyArena();
    error OnlyOwner();
    error NoPendingRewards();
    error CycleNotEnded();
    error CycleAlreadyDistributed();
    error InsufficientBalance();
    error AlreadyClaimedToday();

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ CORE INITIALIZATION
    // ╬════════════════════════════════════════════════════════════════╬

    constructor() {
        leaderboard = LeaderboardContract(0x8E38A86e7D77dA93f47aE4E36186207C67A49cc9);
        owner       = msg.sender;

        // Start first cycle
        _startNewCycle();
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ COMMAND UPLINK: ADMINISTRATIVE
    // ╬════════════════════════════════════════════════════════════════╬

    function setPvPArena(address _arena) external {
        if (msg.sender != owner) revert OnlyOwner();
        pvpArena = _arena;
    }

    function fundPrizePool() external payable {
        currentCycle.prizePool += msg.value;
    }

    function withdrawUnclaimed() external {
        if (msg.sender != owner) revert OnlyOwner();
        // Safety: only withdraw after cycle + 30 days
        require(
            block.timestamp > currentCycle.endsAt + 30 days,
            "Too early"
        );
        payable(owner).transfer(address(this).balance);
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ REWARD LOGISTICS
    // ╬════════════════════════════════════════════════════════════════╬

    /// @notice Record a win and calculate all applicable rewards
    /// @dev Only callable by PvPArena. Emits multiple reward events
    ///      for Somnia Reactivity to push instant notifications.
    function recordWin(
        address winner,
        uint32  winStreak,
        string  calldata empireName
    ) external {
        if (msg.sender != pvpArena) revert OnlyArena();

        PlayerRewardState storage state = playerStates[winner];

        // ── SESSION REWARD ───────────────────────────────────────────
        uint256 sessionAmount = SESSION_REWARD_PER_WIN;
        _issueReward(
            winner,
            sessionAmount,
            RewardType.SESSION,
            empireName
        );

        state.sessionRaidsToday++;
        state.lastSessionAt = uint40(block.timestamp);
        state.totalEarned  += sessionAmount;
        state.pendingAmount += sessionAmount;

        // ── FIRST BLOOD BONUS ────────────────────────────────────────
        bool isNewDay = block.timestamp > state.lastSessionAt + 1 days;
        if (!state.firstBloodToday || isNewDay) {
            state.firstBloodToday = true;
            uint256 firstBloodAmount = FIRST_BLOOD_BONUS;

            _issueReward(
                winner,
                firstBloodAmount,
                RewardType.FIRST_BLOOD,
                empireName
            );

            state.totalEarned  += firstBloodAmount;
            state.pendingAmount += firstBloodAmount;

            emit FirstBloodBonus(winner, empireName, uint40(block.timestamp));
        }

        // ── STREAK BONUS ─────────────────────────────────────────────
        if (winStreak >= 3) {
            uint256 streakBonus = uint256(winStreak) * STREAK_BONUS_MULTIPLIER;

            _issueReward(
                winner,
                streakBonus,
                RewardType.STREAK,
                empireName
            );

            state.totalEarned  += streakBonus;
            state.pendingAmount += streakBonus;

            emit StreakBonusEarned(
                winner,
                winStreak,
                streakBonus,
                empireName
            );
        }

        // ── LEGEND BONUS (top 3) ─────────────────────────────────────
        uint32 rank = leaderboard.getPlayerRank(winner);
        if (rank > 0 && rank <= 3) {
            uint256 legendBonus = SESSION_REWARD_PER_WIN * 2;

            _issueReward(
                winner,
                legendBonus,
                RewardType.LEGEND,
                empireName
            );

            state.totalEarned  += legendBonus;
            state.pendingAmount += legendBonus;
        }
    }

    /// @notice Claim all pending rewards
    /// @dev Transfers accumulated ETH/SOMI to player wallet
    function claimRewards() external nonReentrant {
        PlayerRewardState storage state = playerStates[msg.sender];

        if (state.pendingAmount == 0) revert NoPendingRewards();
        if (address(this).balance < state.pendingAmount) {
            revert InsufficientBalance();
        }

        uint256 amount      = state.pendingAmount;
        state.pendingAmount = 0;
        state.totalClaimed += amount;

        // Upgraded for compatibility with smart contract wallets/AA
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit RewardClaimed(msg.sender, amount, uint40(block.timestamp));
    }

    /// @notice Distribute cycle rewards to top players
    /// @dev Callable by anyone after cycle ends
    function distributeCycleRewards() external {
        if (block.timestamp < currentCycle.endsAt) revert CycleNotEnded();
        if (currentCycle.distributed) revert CycleAlreadyDistributed();

        currentCycle.distributed = true;

        uint256 pool = currentCycle.prizePool;
        if (pool == 0) {
            _startNewCycle();
            return;
        }

        // Get top 10 players
        (address[] memory topPlayers,,) = leaderboard.getTopPlayers(10);

        address rank1 = topPlayers.length > 0 ? topPlayers[0] : address(0);
        address rank2 = topPlayers.length > 1 ? topPlayers[1] : address(0);
        address rank3 = topPlayers.length > 2 ? topPlayers[2] : address(0);

        // Distribute to rank 1
        if (rank1 != address(0)) {
            uint256 r1Amount = (pool * RANK1_PCT) / 100;
            playerStates[rank1].pendingAmount += r1Amount;
            playerStates[rank1].totalEarned   += r1Amount;
            playerStates[rank1].lastCycleClaimAt = uint40(block.timestamp);

            _issueReward(rank1, r1Amount, RewardType.CYCLE,
                _getEmpireName(rank1));
        }

        // Distribute to rank 2
        if (rank2 != address(0)) {
            uint256 r2Amount = (pool * RANK2_PCT) / 100;
            playerStates[rank2].pendingAmount += r2Amount;
            playerStates[rank2].totalEarned   += r2Amount;
            _issueReward(rank2, r2Amount, RewardType.CYCLE,
                _getEmpireName(rank2));
        }

        // Distribute to rank 3
        if (rank3 != address(0)) {
            uint256 r3Amount = (pool * RANK3_PCT) / 100;
            playerStates[rank3].pendingAmount += r3Amount;
            playerStates[rank3].totalEarned   += r3Amount;
            _issueReward(rank3, r3Amount, RewardType.CYCLE,
                _getEmpireName(rank3));
        }

        // Distribute to ranks 4-10
        uint256 mid = (pool * RANK4_10_PCT) / 100;
        uint256 midShare = topPlayers.length > 3
            ? mid / (topPlayers.length - 3)
            : 0;

        for (uint8 i = 3; i < topPlayers.length; i++) {
            address p = topPlayers[i];
            if (p == address(0)) continue;
            playerStates[p].pendingAmount += midShare;
            playerStates[p].totalEarned   += midShare;
            _issueReward(p, midShare, RewardType.CYCLE,
                _getEmpireName(p));
        }

        emit CycleDistributed(
            currentCycle.cycleId,
            rank1, rank2, rank3,
            pool - (pool * REMAINING_PCT / 100) // Log only distributed amount
        );

        // Start next cycle with the remaining 10% as a Jackpot roll-over
        uint256 rollover = (pool * REMAINING_PCT) / 100;
        _startNewCycle();
        currentCycle.prizePool = rollover;
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ TACTICAL INTEL: READ OPERATIONS
    // ╬════════════════════════════════════════════════════════════════╬

    function getPendingRewards(address player)
        external view
        returns (uint256)
    {
        return playerStates[player].pendingAmount;
    }

    function getPlayerRewardState(address player)
        external view
        returns (PlayerRewardState memory)
    {
        return playerStates[player];
    }

    function getReward(uint256 rewardId)
        external view
        returns (Reward memory)
    {
        return rewards[rewardId];
    }

    function getPlayerRewards(address player)
        external view
        returns (uint256[] memory)
    {
        return playerRewardIds[player];
    }

    function getCurrentCycle()
        external view
        returns (CycleInfo memory)
    {
        return currentCycle;
    }

    function getTimeUntilCycleEnd()
        external view
        returns (uint256)
    {
        if (block.timestamp >= currentCycle.endsAt) return 0;
        return currentCycle.endsAt - block.timestamp;
    }

    function getSessionRewards(address player)
        external view
        returns (
            uint256 pendingAmount,
            uint32  raidsToday,
            uint40  lastSessionAt
        )
    {
        PlayerRewardState storage state = playerStates[player];
        return (
            state.pendingAmount,
            state.sessionRaidsToday,
            state.lastSessionAt
        );
    }

    // ╬════════════════════════════════════════════════════════════════╬
    //   ⌬ INTERNAL HEURISTICS
    // ╬════════════════════════════════════════════════════════════════╬

    function _issueReward(
        address    player,
        uint256    amount,
        RewardType rewardType,
        string memory empireName
    ) internal {
        uint256 rewardId = ++_rewardCounter;

        rewards[rewardId] = Reward({
            player:     player,
            amount:     amount,
            rewardType: rewardType,
            earnedAt:   uint40(block.timestamp),
            claimed:    false
        });

        playerRewardIds[player].push(rewardId);

        emit RewardEarned(
            player,
            rewardId,
            amount,
            rewardType,
            empireName,
            uint40(block.timestamp)
        );
    }

    function _startNewCycle() internal {
        uint256 newCycleId = currentCycle.cycleId + 1;
        currentCycle = CycleInfo({
            cycleId:     newCycleId,
            startedAt:   uint40(block.timestamp),
            endsAt:      uint40(block.timestamp) + uint40(CYCLE_DURATION),
            prizePool:   0,
            distributed: false
        });

        emit CycleStarted(
            newCycleId,
            0,
            uint40(block.timestamp) + uint40(CYCLE_DURATION)
        );
    }

    function _getEmpireName(address player)
        internal view
        returns (string memory)
    {
        LeaderboardContract.PlayerStats memory stats =
            leaderboard.getPlayerStats(player);
        if (stats.registered) {
            return stats.empireName;
        }
        return "Unknown Empire";
    }

    receive() external payable {
        currentCycle.prizePool += msg.value;
    }
}
