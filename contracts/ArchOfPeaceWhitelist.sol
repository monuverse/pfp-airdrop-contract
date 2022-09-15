// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./MonuverseEpisode.sol";

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ArchOfPeaceWhitelist is MonuverseEpisode {
    bytes32 private _whitelistRoot;

    modifier onlyWhitelisted(
        string calldata chapter,
        uint256 limit,
        bytes32[] calldata proof
    ) {
        require(
            isAccountWhitelisted(_msgSender(), limit, chapter, proof),
            "ArchOfPeaceWhitelist: caller not whitelisted"
        );

        _;
    }

    modifier onlyWhitelistedQuantity(
        uint256 balance,
        uint256 quantity,
        uint256 limit
    ) {
        require(!(limit < balance + quantity), "ArchOfPeaceWhitelist: exceeding quantity");

        _;
    }

    function setWhitelistRoot(bytes32 newWhitelistRoot) public onlyOwner {
        _whitelistRoot = newWhitelistRoot;
    }

    function isAccountWhitelisted(
        address account,
        uint256 limit,
        string calldata chapter,
        bytes32[] calldata proof
    ) public view returns (bool) {
        require(
            owner() == _msgSender() || account == _msgSender(),
            "ArchOfPeaceWhitelist: account check forbidden"
        );

        return
            MerkleProof.verify(
                proof,
                _whitelistRoot,
                generateWhitelistLeaf(account, limit, chapter)
            );
    }

    function whitelistRoot() public view returns (bytes32) {
        return _whitelistRoot;
    }

    function generateWhitelistLeaf(
        address account,
        uint256 limit,
        string calldata chapter
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, limit, chapter));
    }
}
