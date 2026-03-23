// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BaseContract.sol";
import "../src/LeaderboardContract.sol";
import "../src/EmpireRegistry.sol";
import "../src/ResourceVault.sol";
import "../src/PvPArena.sol";
import "../src/RewardsDistributor.sol";

/// @title DreamSiege Full Test Suite
/// @notice Tests all three contracts: BaseContract, AttackContract, LeaderboardContract
contract DreamSiegeTest is Test {

    BaseContract        internal base;
    LeaderboardContract internal leaderboard;
    EmpireRegistry      internal registry;
    ResourceVault       internal vault;
    PvPArena            internal arena;
    RewardsDistributor  internal rewards;

    address internal ALICE   = makeAddr("alice");
    address internal BOB     = makeAddr("bob");
    address internal CHARLIE = makeAddr("charlie");
    address internal DEPLOYER = address(this);

    // ─────────────────────────────────────────────────────────────────────────
    // SETUP
    // ─────────────────────────────────────────────────────────────────────────

    function setUp() public {
        // Deploy in dependency order
        base        = new BaseContract();
        leaderboard = new LeaderboardContract();
        registry    = new EmpireRegistry(address(leaderboard));
        vault       = new ResourceVault();
        arena       = new PvPArena();
        rewards     = new RewardsDistributor();

        // Wire contracts
        base.setAttackContract(address(arena));
        base.setResourceVault(address(vault));
        
        vault.setBaseContract(address(base));
        vault.setPvPArena(address(arena));

        arena.setBaseContract(address(base));
        // Note: Pyth entropy might need setting if tested
        
        rewards.setPvPArena(address(arena));

        leaderboard.setPvPArena(address(arena));
        leaderboard.setEmpireRegistry(address(registry));

        // Initialize test bases
        vm.prank(ALICE);
        base.initializeBase();

        vm.prank(BOB);
        base.initializeBase();
    }

    // ⌬ TACTICAL VALIDATION LOGIC

    function test_citadel_initialization() public {
        BaseContract.Base memory aliceBase = base.getBase(ALICE);
        assertEq(aliceBase.owner,       ALICE);
        assertTrue(aliceBase.initialized);
    }

    function test_hall_of_legends_registration() public {
        vm.prank(ALICE);
        registry.registerEmpire("Aether Legion", "Dragon");
        
        LeaderboardContract.PlayerStats memory stats = leaderboard.getPlayerStats(ALICE);
        assertEq(stats.empireName, "Aether Legion");
        assertTrue(stats.registered);
    }

    function test_resource_vault_tick() public {
        vm.warp(block.timestamp + 60);
        vm.prank(ALICE);
        vault.collectResources();
        
        ResourceVault.Resources memory res = vault.getResources(ALICE);
        assertGt(res.credits, 500);
    }
}
