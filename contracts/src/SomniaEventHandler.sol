// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ISomniaEventHandler.sol";

/**
 * @title SomniaEventHandler
 * @notice Abstract contract to be inherited by contracts that want to handle Somnia Reactivity events.
 */
abstract contract SomniaEventHandler is ISomniaEventHandler {
    /**
     * @notice Callback function invoked by the Somnia Reactivity Precompile.
     * @dev Only allows the precompile to call this function.
     */
    function onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) external virtual override {
        require(msg.sender == address(0x0100), "SomniaEventHandler: only precompile");
        _onEvent(emitter, eventTopics, data);
    }

    /**
     * @notice Internal implementation of the event handler.
     * @param emitter The address of the contract that emitted the event.
     * @param eventTopics The topics associated with the event.
     * @param data The data payload of the event.
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal virtual;
}
