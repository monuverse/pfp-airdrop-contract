//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MonuverseWhitelist is Ownable {
    bytes32 private _whitelistRoot;

    // modifier onlyWhitelisted(bytes32[] calldata proof, uint256 allowance) {
    //     require(
    //         isAccountWhitelisted(_msgSender(), allowance, proof, chapter),
    //         "MonuverseWhitelist: caller is not whitelisted"
    //     );
    //     _;
    // }

    // constructor() {
    //     _whitelistRoot = whitelistRoot_;
    // }

    function setWhitelistRoot(bytes32 newWhitelistRoot) public onlyOwner {
        _whitelistRoot = newWhitelistRoot;
    }

    function whitelistRoot() public view returns (bytes32) {
        return _whitelistRoot;
    }

    function isAccountWhitelisted(
        address account,
        uint256 allowedQuantity,
        bytes32 chapter,
        bytes32[] calldata proof
    ) public view returns (bool) {
        require(
            owner() == _msgSender() || account == _msgSender(),
            "Not allowed to check other users"
        );

        return
            MerkleProof.verify(
                proof,
                _whitelistRoot,
                generateWhitelistLeaf(account, allowedQuantity, chapter)
            );
    }

    function generateWhitelistLeaf(
        address account,
        uint256 allowedQuantity,
        bytes32 chapter
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, allowedQuantity, chapter));
    }
}
