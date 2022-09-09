// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "erc721psi/contracts/ERC721Psi.sol";
import "./MonuverseEntropy.sol";
import "./MonuverseWhitelist.sol";

import "fpe-map/contracts/FPEMap.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @title Monuverse: Arch of Peace
/// @author Maxim Gaina

contract ArchOfLight is ERC721Psi, MonuverseEntropy, MonuverseWhitelist {
    using FPEMap for uint256;
    using Strings for uint256;

    uint256 private immutable _maxSupply;

    string private _archVeilURI;
    string private _archBaseURI;

    constructor(
        uint256 maxSupply_,
        string memory name_,
        string memory symbol_,
        string memory archVeilURI_,
        string memory archBaseURI_,
        address vrfCoordinator_,
        bytes32 vrfGasLane_,
        uint64 vrfSubscriptionId_
    )
        ERC721Psi(name_, symbol_)
        MonuverseEntropy(vrfCoordinator_, vrfGasLane_, vrfSubscriptionId_)
    {
        _maxSupply = maxSupply_;
        _archVeilURI = archVeilURI_;
        _archBaseURI = archBaseURI_;
    }

    /// @dev quantity greater than 0 is already required by ERC721Psi
    function mint(uint256 quantity, string calldata group, bytes32[] calldata proof)
        external
        payable
        onlyWhitelisted(group, quantity, proof)
        onlyDuringMintingChapters
        onlyChapterMintingGroups(group)
        onlyChapterMatchingPrices(group, quantity, msg.value)
        returns (uint256)
    {
        uint256 allocation = _availableAllocation(_minted);
        if (quantity > allocation) {
            quantity = allocation;
        }

        quantity -= balanceOf(_msgSender());

        _safeMint(_msgSender(), quantity);

        if (_availableAllocation(_minted) == 0) {
            _tryQuitMintingChapter();
        }

        return quantity;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ERC721Psi._exists(tokenId), "ArchOfLight: non existent token");

        uint256 seed = MonuverseEntropy.seed();

        return
            seed == 0
                ? _archVeilURI
                : string(
                    abi.encodePacked(
                        _archBaseURI,
                        tokenId.fpeMappingFeistelAuto(seed, _maxSupply).toString()
                    )
                );
    }

    function reveal() public onlyDuringRevealingChapters {
        require(MonuverseEntropy.seed() == 0, "ArchOfLight: already revealed");
        MonuverseEntropy._requestRandomWord();
    }
}