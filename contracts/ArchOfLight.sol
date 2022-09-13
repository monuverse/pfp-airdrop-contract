// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "erc721psi/contracts/ERC721Psi.sol";
import "./MonuverseEpisode.sol";
import "./MonuverseEntropy.sol";
import "./MonuverseWhitelist.sol";

import "fpe-map/contracts/FPEMap.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Monuverse: Arch of Peace
 * @author Maxim Gaina

                    └╬┘░.       .<░└╬┘░>.       .░└╬┘
                  ──══──────═════════════════──────══──
                   ███████████████████████████████████
                  ═════════════╗░░░░░░░░░╔═════════════
                   ░░░░░░░░░░░░╚═════════╝░░░░░░░░░░░░
                   █████████████░░░░░░░░░█████████████
                   ╦╦╦     ╦╦╦ ╚█████████╝ ╦╦╦     ╦╦╦
                   │█│▒▒▒▒▒│█│▒▒▒▒░░╬░░▒▒▒▒│█│▒▒▒▒▒│█│
                  ═│█│═════│█│══▒░┌ ^ ┐░▒══│█│═════│█│═
                   │█│░░░░░│█│▒░┌┘     └┐░▒│█│░░░░░│█│
                   │█│░░░░░│█│░┌┘       └┐░│█│░░░░░│█│
                   │█│░░┌─░│█│░┘         └░│█│░─┐░░│█│
                   │█│░┌┘  │█│░│         │░│█│  └┐░│█│
                   │█│░│   │█│░│         │░│█│   │░│█│
                   ╩╩╩░│   ╩╩╩░│         │░╩╩╩   │░╩╩╩
                  ████░│  ████░│         │░████  │░████
                  ████░│  ████░│         │░████  │░████ presented by
     __  __  ___  _   _ _   _ _|   ___________________________________
    |  \/  |/ _ \| \ | | | | | |  / /__  ____/__  __ \_  ___/__  ____/
    | |\/| | | | |  \| | | | | | / /__  __/  __  /_/ /____ \__  __/
    | |  | | |_| | |\  | |_| | |/ / _  /___  _  _, _/____/ /_  /___
    |_|  |_|\___/|_| \_|\___/ ___/  /_____/  /_/ |_| /____/ /_____/ a Reasoned Art project

*/

contract ArchOfPeace is MonuverseEpisode, ERC721Psi, MonuverseEntropy, ArchOfPeaceWhitelist {
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

    function mint(
        uint256 quantity,
        uint256 limit,
        string calldata group,
        bytes32[] calldata proof
    )
        public
        payable
        onlyDuringMintingChapters
        onlyWhitelisted(group, limit, proof)
        onlyWhitelistedQuantity(balanceOf(_msgSender()), quantity, limit)
        onlyChapterMintGroups(group)
        onlyChapterMintLimit(quantity, _minted)
        onlyChapterMintPrices(group, quantity, msg.value)
    {
        _safeMint(_msgSender(), quantity);

        if (_minted == _currentMintLimit()) {
            _maxSupply == _currentMintLimit()
                ? _emitMonumentalEvent(EpisodeMinted.selector)
                : _emitMonumentalEvent(ChapterMinted.selector);
        }
    }

    function mint(uint256 quantity) external payable onlyDuringMintingChapters {}

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ERC721Psi._exists(tokenId), "ArchOfPeace: non existent token");

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

    function reveal() external onlyDuringRevealingChapters {
        require(MonuverseEntropy.seed() == 0, "ArchOfPeace: already revealed");

        // TODO: require there is no unfulfilled request id
        MonuverseEntropy._requestRandomWord();
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");

        require(success, "ArchOfPeace: withdrawal unsuccessful");
    }
}
