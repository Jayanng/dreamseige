// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/EmpireRegistry.sol";
import "../src/ResourceVault.sol";
import "../src/PvPArena.sol";
import "../src/RewardsDistributor.sol";
import "../src/BaseContract.sol";

contract AtomicDeploy is Script {
    function deployRegistry(address leaderboard) external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        new EmpireRegistry(leaderboard);
        vm.stopBroadcast();
    }

    function deployVault() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        new ResourceVault();
        vm.stopBroadcast();
    }

    function deployArena() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        new PvPArena();
        vm.stopBroadcast();
    }

    function deployDistributor() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        new RewardsDistributor();
        vm.stopBroadcast();
    }

    function deployBase() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        new BaseContract();
        vm.stopBroadcast();
    }
}
