// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MonuverseWhitelist is Ownable {
    bytes32 private _whitelistRoot;

    modifier onlyWhitelisted(
        string calldata chapter,
        uint256 quantity,
        bytes32[] calldata proof
    ) {
        require(
            isAccountWhitelisted(_msgSender(), quantity, chapter, proof),
            "MonuverseWhitelist: caller not whitelisted"
        );
        _;
    }

    function setWhitelistRoot(bytes32 newWhitelistRoot) public onlyOwner {
        _whitelistRoot = newWhitelistRoot;
    }

    function isAccountWhitelisted(
        address account,
        uint256 quantity,
        string calldata chapter,
        bytes32[] calldata proof
    ) public view returns (bool) {
        require(
            owner() == _msgSender() || account == _msgSender(),
            "MonuverseWhitelist: not allowed to check other users"
        );

        return
            MerkleProof.verify(
                proof,
                _whitelistRoot,
                generateWhitelistLeaf(account, quantity, chapter)
            );
    }

    function whitelistRoot() public view returns (bytes32) {
        return _whitelistRoot;
    }

    function generateWhitelistLeaf(
        address account,
        uint256 quantity,
        string calldata chapter
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, quantity, chapter));
    }
}
