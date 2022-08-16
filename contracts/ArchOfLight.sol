// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "erc721psi/contracts/ERC721Psi.sol";
import "./ArchOfLightChaos.sol";

import "fpe-map/contracts/FPEMap.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/*
 __  __  ___  _   _ _   _ _    ___________________________________
|  \/  |/ _ \| \ | | | | | |  / /__  ____/__  __ \_  ___/__  ____/
| |\/| | | | |  \| | | | | | / /__  __/  __  /_/ /____ \__  __/
| |  | | |_| | |\  | |_| | |/ / _  /___  _  _, _/____/ /_  /___
|_|  |_|\___/|_| \_|\___/ ___/  /_____/  /_/ |_| /____/ /_____/
    .presents(
            ──══──────═════════════════──────══──
             ███████████████████████████████████
             ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
            ═════════════╗░░░░A░░░░╔═════════════
             ░░░░░░░░░░░░╚═════════╝░░░░░░░░░░░░
             █████████████░░░░░░░░░█████████████
             ╦╦╦     ╦╦╦ ╚█████████╝ ╦╦╦     ╦╦╦
             │█│░░░░░│█│▒▒▒▒▒▒╬▒▒▒▒▒▒│█│░░░░░│█│
             │█│▒▒▒▒▒│█│▒▒▒▒░░░░░▒▒▒▒│█│▒▒▒▒▒│█│
            ═│█│═════│█│══▒░┌ A ┐░▒══│█│═════│█│═
             │█│░░░░░│█│▒░┌┘  R  └┐░▒│█│░░░░░│█│
             │█│░░░░░│█│░┌┘   C   └┐░│█│░░░░░│█│
             │█│░░┌─░│█│░┘    H    └░│█│░─┐░░│█│
             │█│░┌┘  │█│░│         │░│█│  └┐░│█│
             │█│░│   │█│░│    O    │░│█│   │░│█│
             ╩╩╩░│   ╩╩╩░│    F    │░╩╩╩   │░╩╩╩
            ████░│  ████░│         │░████  │░████
            ████░│  ████░│    L    │░████  │░████
    );
*/

/// @title Monuverse: Arch of Light
/// @author Maxim Gaina

contract ArchOfLight is ERC721Psi, ArchOfLightChaos {
    using FPEMap for uint256;

    uint256 private _maxSupply;

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
                        FPEMap.fpeMappingFeistelAuto(tokenId, seed, _maxSupply)
                    )
                );
    }

    function _baseURI() internal view override returns (string memory) {
        return _archBaseURI;
    }

    function unveilArch() public onlyOwner {
        ArchOfLightChaos._requestRandomWord();
    }
}

// mint
// premint metadata
