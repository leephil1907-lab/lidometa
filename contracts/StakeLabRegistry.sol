// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title StakeLabRegistry
/// @notice Minimal testnet-only wallet registration example. No funds or token approvals are accepted.
contract StakeLabRegistry {
    struct Registration {
        uint64 registeredAt;
        bool registered;
    }

    mapping(address => Registration) public registrations;

    event Registered(address indexed account, uint64 timestamp);

    function register() external {
        require(!registrations[msg.sender].registered, "Already registered");
        uint64 timestamp = uint64(block.timestamp);
        registrations[msg.sender] = Registration({registeredAt: timestamp, registered: true});
        emit Registered(msg.sender, timestamp);
    }

    function isRegistered(address account) external view returns (bool) {
        return registrations[account].registered;
    }
}
