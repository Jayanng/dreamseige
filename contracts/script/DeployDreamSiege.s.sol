// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BaseContract.sol";
import "../src/LeaderboardContract.sol";
import "../src/EmpireRegistry.sol";
import "../src/ResourceVault.sol";
import "../src/PvPArena.sol";
import "../src/RewardsDistributor.sol";

/// @title DeployDreamSiege
/// @notice Deploys all three DreamSiege contracts in dependency order:
///         1. LeaderboardContract (no dependencies)
///         2. BaseContract (no dependencies)
///         3. AttackContract (depends on Base + Leaderboard)
///         4. Wire: BaseContract.setAttackContract(attack)
///         5. Wire: LeaderboardContract.setAttackContract(attack)
contract DeployDreamSiege is Script {

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("=== DreamSiege Final Deployment Cycle ===");
        console.log("Deployer:  ", deployer);
        console.log("Chain ID:  ", block.chainid);

        vm.startBroadcast(deployerKey);

        // ── Step 1: Core Citadel Foundation ──────────────────────────────
        BaseContract base = new BaseContract();
        console.log("BaseContract deployed at:       ", address(base));

        LeaderboardContract leaderboard = new LeaderboardContract();
        console.log("LeaderboardContract deployed at:", address(leaderboard));

        // ── Step 2: Economic & Identity Modules ─────────────────────────────
        EmpireRegistry registry = new EmpireRegistry(address(leaderboard));
        console.log("EmpireRegistry deployed at:     ", address(registry));

        ResourceVault vault = new ResourceVault();
        console.log("ResourceVault deployed at:      ", address(vault));

        // ── Step 3: Battle Engine ──────────────────────────────────────────
        PvPArena arena = new PvPArena();
        console.log("PvPArena deployed at:           ", address(arena));

        // ── Step 4: Logistic Rewards ───────────────────────────────────────
        RewardsDistributor rewards = new RewardsDistributor();
        console.log("RewardsDistributor deployed at: ", address(rewards));

        // ── Step 5: Protocol Wiring ─────────────────────────────────────────
        base.setAttackContract(address(arena));
        base.setResourceVault(address(vault));
        
        vault.setBaseContract(address(base));
        vault.setPvPArena(address(arena));

        arena.setBaseContract(address(base));
        // Note: Pyth entropy/provider can be set via arena.setPythEntropy if needed

        leaderboard.setPvPArena(address(arena));
        leaderboard.setEmpireRegistry(address(registry));
        
        rewards.setPvPArena(address(arena));

        console.log("Protocol hierarchy successfully wired.");

        vm.stopBroadcast();

        // ── Output addresses for frontend constants file ─────────────────────
        console.log("\n=== TACTICAL INTEL: FRONTEND CONSTANTS ===");
        console.log("BASE_CONTRACT_ADDRESS:        ", address(base));
        console.log("LEADERBOARD_CONTRACT_ADDRESS: ", address(leaderboard));
        console.log("EMPIRE_REGISTRY_ADDRESS:      ", address(registry));
        console.log("RESOURCE_VAULT_ADDRESS:       ", address(vault));
        console.log("PVP_ARENA_ADDRESS:            ", address(arena));
        console.log("REWARDS_DISTRIBUTOR_ADDRESS:  ", address(rewards));
    }
}
