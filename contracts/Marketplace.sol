// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Marketplace is Ownable {
    using Counters for Counters.Counter;

    event ItemPreordered(
        uint256 _startDate,
        uint256 _endDate,
        uint256 _idItem,
        uint256 _timestamp
    );

    mapping(bytes32 => bool) private hashesUsed;
    mapping(uint256 => Item) private items;
    Counters.Counter private numberOfPreorders;

    struct Item {
        uint256 id;
    }

    constructor() {}

    function preorderItem(
        uint256 _id,
        uint256 _startDate,
        uint256 _endDate,
        bytes32 _hash,
        bytes memory _signature
    ) external returns (bool) {
        require(
            _startDate < _endDate,
            "starting date must be less then ending date"
        );
        require(!hashesUsed[_hash], "This hash was already used"); //to avoid replay attacks
        require(
            ECDSA.recover(_hash, _signature) == owner(),
            "This signature is invalid, signer doesn't match the owner"
        );

        numberOfPreorders.increment();
        hashesUsed[_hash] = true;

        Item memory item;
        item.id = _id;
        items[_id] = item;

        return true;
    }

    function getOwner() public view returns (address) {
        return owner();
    }

    function getNumberOfItems() public view returns (uint256) {
        return numberOfPreorders.current();
    }

    function getItem(uint256 _id) public view returns (Item memory) {
        return items[_id];
    }

    function isHashAlreadyUser(bytes32 _hash) public view returns(bool) {
        return hashesUsed[_hash];
    }

    function verifySignature(bytes32 _hash, bytes memory _signature)
        public
        pure
        returns (address)
    {
        return ECDSA.recover(_hash, _signature);
    }
}
