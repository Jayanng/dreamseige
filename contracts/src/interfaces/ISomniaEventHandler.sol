// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISomniaEventHandler
 * @notice Interface for contracts that handle Somnia Reactivity event callbacks.
 */
interface ISomniaEventHandler {
    /**
     * @notice Callback function invoked by the Somnia Reactivity Precompile.
     * @param emitter The address of the contract that emitted the event.
     * @param eventTopics The topics associated with the event.
     * @param data The data payload of the event.
     */
    function onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) external;
}
