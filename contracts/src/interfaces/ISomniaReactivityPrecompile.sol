// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISomniaReactivityPrecompile
 * @notice Interface for the Somnia Reactivity Precompile at address 0x0100.
 */
interface ISomniaReactivityPrecompile {
    struct SubscriptionData {
        bytes32[4] eventTopics;      // Topic filter (0x0 for wildcard)
        address origin;              // Origin (tx.origin) filter (address(0) for wildcard)
        address caller;              // Caller (msg.sender) filter (address(0) for wildcard)
        address emitter;             // Contract emitting the event (address(0) for wildcard)
        address handlerContractAddress; // Address of the contract to handle the event
        bytes4 handlerFunctionSelector; // Function selector in the handler contract
        uint64 priorityFeePerGas;    // Extra fee to prioritize handling, in nanoSomi
        uint64 maxFeePerGas;         // Max fee willing to pay, in nanoSomi
        uint64 gasLimit;             // Maximum gas that will be provisioned per subscription callback
        bool isGuaranteed;           // If true, moves to next block if current is full
        bool isCoalesced;            // If true, multiple events can be coalesced
    }

    event SubscriptionCreated(uint64 indexed subscriptionId, address indexed owner, SubscriptionData subscriptionData);
    event SubscriptionRemoved(uint64 indexed subscriptionId, address indexed owner);

    function subscribe(SubscriptionData calldata subscriptionData) external returns (uint256 subscriptionId);
    function unsubscribe(uint256 subscriptionId) external;
    function getSubscriptionInfo(uint256 subscriptionId) external view returns (SubscriptionData memory subscriptionData, address owner);
}
