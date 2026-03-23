// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

contract FundHandlers is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address arena = vm.envAddress("PVP_ARENA_ADDRESS");
        
        vm.startBroadcast(deployerKey);
        // Fund with 35 SOM to be safe (min 32 required)
        payable(arena).transfer(35 ether);
        vm.stopBroadcast();
        
        console.log("Funded PvPArena with 35 SOM");
    }
}
