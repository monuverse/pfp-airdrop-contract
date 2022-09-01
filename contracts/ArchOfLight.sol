// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "erc721psi/contracts/ERC721Psi.sol";
import "./ArchOfLightChaos.sol";

import "fpe-map/contracts/FPEMap.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title Monuverse: Arch of Light
/// @author Maxim Gaina

contract ArchOfLight is ERC721Psi, ArchOfLightChaos {
    using FPEMap for uint256;
    using Strings for uint256;

    uint256 private _maxSupply = 7777;

    string private _archVeilURI;
    string private _archBaseURI;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory archVeilURI_,
        string memory archBaseURI_,
        address vrfCoordinator_,
        bytes32 vrfGasLane_,
        uint64 vrfSubscriptionId_
    ) ERC721Psi(name_, symbol_) ArchOfLightChaos(vrfCoordinator_, vrfGasLane_, vrfSubscriptionId_) {
        _archVeilURI = archVeilURI_;
        _archBaseURI = archBaseURI_;
    }

    function mint(uint256 quantity) external payable {
        _safeMint(msg.sender, quantity);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ERC721Psi._exists(tokenId), "ArchOfLight: non existent token");

        uint256 seed = ArchOfLightChaos._seed();

        return
            seed == 0
                ? _archVeilURI
                : string(
                    abi.encodePacked(
                        _baseURI(),
                        tokenId.fpeMappingFeistelAuto(seed, ERC721Psi._minted).toString()
                    )
                );
    }

    function _baseURI() internal view override returns (string memory) {
        return _archBaseURI;
    }

    function unveil() public onlyOwner {
        ArchOfLightChaos._requestRandomWord();
    }
}

// mint
// premint metadata
