// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./MonuverseEpisode.sol";
import "erc721psi/contracts/ERC721Psi.sol";
import "./ArchOfPeaceEntropy.sol";
import "./ArchOfPeaceWhitelist.sol";

import "fpe-map/contracts/FPEMap.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


                                /*░└╬┘░*\
             ░      ░█░┘────════════╩════════────└╩┘──
                ▒  ▒█ ████████████████████████████████
              ▒█  ═════════════╗░░▒▒▒▒▒░░╔═════════════
            ▒   ▒ █▒▒▒░░░░▒▒▒░░╚═════════╝░░▒▒▒░░░░░░▒
             ░ █▒  █ ███████████░░░▒▒▒░░░█████████████
                █  ░╦░     ╦╦╦ ╚█████████╝ ╦╦╦     ╦╦╦
                   │▒│░░▒▒▒│█│░▒▒▒░ ╬ ░▒▒▒░│█│▒▒▒░░│█│
                 ▒ │█│─────│█│─═▒░┌ ^ ╗░▒══│█│═════│█│═
                   │█│░▒▒░░│█│▒░┌┘     ╚╗░▒│█│░░▒▒░│█│
                   │▒│▒▒░ ░│█│░┌┘       ╚╗░│█│░ ░▒▒│█│
                     │▒░┌─░│█│░┘         ╚░│█│░=╗░▒│█│
                   │▒│▒┌   │█│░│         ║░│█│  ╚╗▒│█│
                 █ │█│▒│   │█│▒│         ║▒│█│   ║▒│█│
              █ ▒  ╩╩╩▒    ╩╩╩▒          ║▒╩╩╩   ║▒╩╩╩
             ░  █ ▒███▒   ████▒│    ░    ║▒████  ║▒████
           ░  ▒█ ▒██▒█▒│  ████▒│   ░░░   ║▒████__║▒████
     __  __  ___ ▒█▒▒█▒│  ██▒░▒│  ░░▒░░  ║█████████████_____________________
    |  \/  |/ _ \█ \░▒ | |▒█ |\ \░░▒▒▒░░/ /__  ____/__  __ \_  ___/__  ____/
    | |\/| | | | |  \▒ | |░▒ | \ ░▒▒▒▒▒░ /__  __/  __  /_/ /____ \__  __/
    | |  | | |_| | |\  | |_░ |  \ ▒▒█▒▒ /__  /___  _  _, _/____/ /_  /___
    |_|  |_|\___/|_| \_|\___/    \ ███ /  /_____/  /_/ |_| /____/ /_____/
                                  \ █ /
    a Reasoned Art project         \*/

/**
 * @title Monuverse Episode 1 ─ Arch Of Peace
 * @author Maxim Gaina
 *
 * @notice ArchOfPeace Collection Contract with
 * @notice On-chain programmable lifecycle and, regardless of collection size,
 * @notice O(1) fully decentralized and unpredictable reveal.
 *
 * @dev ArchOfPeace Collection is a Monuverse Episode;
 * @dev an Episode has a lifecycle that is composed of Chapters;
 * @dev each Chapter selectively enables contract features and emits Monumental Events;
 * @dev each Monumental Event can make the Episode transition into a new Chapter;
 * @dev each transition follows the onchain programmable story branching;
 * @dev episode branching is a configurable Deterministic Finite Automata.
 */
contract ArchOfPeace is MonuverseEpisode, ERC721Psi, ArchOfPeaceEntropy, ArchOfPeaceWhitelist {
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
        ArchOfPeaceEntropy(vrfCoordinator_, vrfGasLane_, vrfSubscriptionId_)
    {
        _maxSupply = maxSupply_;
        _archVeilURI = archVeilURI_;
        _archBaseURI = archBaseURI_;
    }

    function mint(
        uint256 quantity,
        uint256 limit,
        bytes32 birth,
        bytes32[] memory proof
    ) public payable {
        if (birth != 0x00) {
            require(
                isAccountWhitelisted(_msgSender(), limit, birth, proof),
                "ArchOfPeace: sender not whitelisted"
            );
        }
        require(
            _isQuantityWhitelisted(balanceOf(_msgSender()), quantity, limit),
            "ArchOfPeace: quantity not allowed"
        );
        require(_chapterAllowsMint(quantity, _minted), "ArchOfPeace: no mint chapter");
        require(_chapterAllowsMintGroup(birth), "ArchOfPeace: sender group not allowed");
        require(_chapterMatchesOffer(quantity, msg.value, birth), "ArchOfPeace: offer unmatched");

        _safeMint(_msgSender(), quantity);

        if (_minted == _chapterMintLimit()) {
            _maxSupply == _chapterMintLimit()
                ? _emitMonumentalEvent(EpisodeMinted.selector)
                : _emitMonumentalEvent(ChapterMinted.selector);
        }
    }

    function mint(uint256 quantity) public payable {
        mint(quantity, 5, 0x00, new bytes32[](0x00));
    }

    /**
     * @notice Reveals the entire collection when call effects are successful
     *
     * @dev Requests a random seed that will be fulfilled in the future;
     * @dev seed will be used to randomly map token ids to metadata ids;
     * @dev callable only once in the entire Episode (i.e. collection lifecycle),
     * @dev that is, if seed is still default value and not waiting for any request;
     * @dev callable by anyone at any moment only during Reveal Chapter.
     */
    function reveal() external onlyDuringRevealingChapters {
        require(seed() == 0, "ArchOfPeace: already revealed");

        // TODO: require there is no unfulfilled request id
        _requestRandomWord();
    }

    /**
     * @notice Obtains mapped URI for an existing token.
     * @param tokenId existing token ID.
     *
     * @dev Pre-reveal all tokens are mapped to the same `_archVeilURI`;
     * @dev post-reveal each token is unpredictably mapped to its own URI;
     * @dev post-reveal is when VRFCoordinatorV2 has successfully fulfilled random word request;
     * @dev more info https://mirror.xyz/ctor.xyz/ZEY5-wn-3EeHzkTUhACNJZVKc0-R6EsDwwHMr5YJEn0.
     *
     * @return tokenURI token URI string
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ERC721Psi._exists(tokenId), "ArchOfPeace: non existent token");

        return
            seed() == 0
                ? _archVeilURI
                : string(
                    abi.encodePacked(
                        _archBaseURI,
                        tokenId.fpeMappingFeistelAuto(seed(), _maxSupply).toString()
                    )
                );
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");

        require(success, "ArchOfPeace: withdrawal unsuccessful");
    }
}
