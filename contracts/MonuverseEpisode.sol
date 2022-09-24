// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./IMonuverseEpisode.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./DFA.sol";

contract MonuverseEpisode is IMonuverseEpisode, Ownable {
    using DFA for DFA.Dfa;

    /// @dev Episode Chapters
    mapping(bytes32 => Chapter) private _chapters;

    /// @dev Episode story Branching
    DFA.Dfa private _branching;

    /// @dev Current Chapter
    bytes32 private _current;

    modifier onlyInitialChapter() {
        require(_current == _branching.initial(), "MonuverseEpisode: updates forbidden");
        _;
    }

    modifier onlyRevealChapter() {
        require(_chapters[_current].revealing, "MonuverseEpisode: reveal not allowed");
        _;
    }

    modifier emitsRevealMonumentalEvent() {
        _;
        _emitMonumentalEvent(EpisodeRevealed.selector);
    }

    constructor(string memory initial_) {
        _current = writeChapter(initial_, false, 0, 0, false);
        _branching.setInitial(_current);
    }

    function writeChapter(
        string memory label,
        bool whitelisting,
        uint256 allocation,
        uint256 price,
        bool revealing
    ) public onlyOwner onlyInitialChapter returns (bytes32) {
        require(!(revealing && allocation > 0), "MonuverseEpisode: reveal with mint forbidden");
        // Still possible to insert mint chapter after reveal chapter since DFAs don't
        // have state order guarantees, make mint function check for occured reveal

        if (whitelisting) {
            _chapters[hash(label)].whitelisting = whitelisting;
        }

        if (allocation > 0) {
            _chapters[hash(label)].minting.limit = allocation;

            if (price > 0) {
                _chapters[hash(label)].minting.price = price;
            }
        } else if (revealing) {
            _chapters[hash(label)].revealing = revealing;
        }

        _chapters[hash(label)].exists = true;

        emit ChapterWritten(label, whitelisting, allocation, price, revealing);

        return hash(label);
    }

    /// @dev Chapter-related transitions should be separately removed before.
    /// @dev MintGroupRules should be removed separately before.
    function removeChapter(string calldata label) external onlyOwner onlyInitialChapter {
        delete _chapters[hash(label)];

        emit ChapterRemoved(label);
    }

    function writeChapterMintGroup(
        string calldata label,
        string calldata group,
        MintGroupRules calldata mintRules
    ) external onlyOwner onlyInitialChapter {
        require(
            _chapters[hash(group)].exists,
            "MonuverseEpisode: group non existent"
        );
        require(
            _chapters[hash(label)].minting.limit > 0,
            "MonuverseEpisode: chapter mint disabled"
        );

        _chapters[hash(label)].minting.rules[hash(group)] = mintRules;

        emit ChapterMintGroupWritten(label, group, mintRules.fixedPrice);
    }

    function removeChapterMintGroup(string calldata label, string calldata group)
        external
        onlyOwner
        onlyInitialChapter
    {
        delete _chapters[hash(label)].minting.rules[hash(group)];

        emit ChapterMintGroupRemoved(label, group);
    }

    function writeTransition(
        string calldata from,
        string calldata to,
        string calldata monumentalEvent
    ) external onlyOwner onlyInitialChapter {
        require(_chapters[hash(from)].exists, "MonuverseEpisode: from not set");
        require(_chapters[hash(to)].exists, "MonuverseEpisode: to not set");

        _branching.addTransition(
            hash(from),
            hash(to),
            keccak256(abi.encodePacked(monumentalEvent, "(bytes32,bytes32)"))
        );
    }

    function removeTransition(bytes32 from, string calldata monumentalEvent)
        external
        onlyOwner
        onlyInitialChapter
    {
        _branching.removeTransition(from, hash(monumentalEvent));
    }

    /// @dev `aux` equals `_current` when transition destination is same as origin,
    /// @dev `aux` equals `_current` also when no transition has been specified,
    /// @dev (to prevent user from seeing its tx reverted)
    function _tryTransition(bytes32 symbol) private returns (bytes32, bytes32) {
        bytes32 aux = _branching.transition(_current, symbol);

        if (_current != aux && aux != 0x00) {
            (_current, aux) = (aux, _current);
        }

        return (aux, _current);
    }

    function _emitMonumentalEvent(bytes32 selector) internal {
        (bytes32 prev, bytes32 current) = _tryTransition(selector);

        if (selector == ChapterMinted.selector) {
            emit ChapterMinted(prev, current);
        } else if (selector == ManuallyTransitioned.selector) {
            emit ManuallyTransitioned(prev, current);
        } else if (selector == EpisodeMinted.selector) {
            emit EpisodeMinted(prev, current);
        } else if (selector == EpisodeRevealed.selector) {
            emit EpisodeRevealed(prev, current);
        }
    }

    function _chapterAllowsMint(uint256 quantity, uint256 minted) internal view returns (bool) {
        // This single require checks for two conditions at once:
        // (a) if minting allowed at all (current chapter allocation > 0), and
        // (b) if current available chapter allocation is not enough fo quantity
        return minted + quantity <= _chapters[_current].minting.limit;
    }

    function _chapterAllowsMintGroup(bytes32 birth) internal view returns (bool) {
        return _chapters[_current].minting.rules[birth].enabled;
    }

    function _chapterMatchesOffer(
        uint256 quantity,
        uint256 offer,
        bytes32 birth
    ) internal view returns (bool) {
        uint256 price;
        _chapters[_current].minting.rules[birth].fixedPrice
            ? price = _chapters[birth].minting.price
            : price = _chapters[_current].minting.price;

        return quantity * price >= offer;
    }

    function _chapterMintLimit() internal view returns (uint256) {
        return _chapters[_current].minting.limit;
    }

    function hash(string memory str) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(str));
    }
}
