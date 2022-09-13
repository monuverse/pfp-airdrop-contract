// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./IMonuverseEpisode.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

import "./DFA.sol";

contract MonuverseEpisode is IMonuverseEpisode, Ownable {
    using DFA for DFA.Dfa;

    /// @notice Each chapter enables the collection to perform in a desired manner
    mapping(bytes32 => Chapter) private _chapters;

    /// @notice A collection has a story made of chapters
    DFA.Dfa private _branching;

    /// @notice Story is running if current chapter isn't default value 0x00
    bytes32 private _current;

    modifier onlyDuringMintingChapters() {
        require(_chapters[_current].minting.limit > 0, "MonuverseEpisode: minting not allowed");
        _;
    }

    modifier onlyChapterMintGroups(string calldata group) {
        require(
            _chapters[_current].minting.rules[hash(group)].enabled,
            "MonuverseEpisode: group not enabled"
        );
        _;
    }

    modifier onlyChapterMintLimit(uint256 quantity, uint256 minted) {
        require(
            !(_chapters[_current].minting.limit < minted + quantity),
            "MonuverseEpisode: exceeding minting limit"
        );
        _;
    }

    modifier onlyChapterMintPrices(
        string calldata groupLabel,
        uint256 quantity,
        uint256 offer
    ) {
        uint256 price;
        _chapters[_current].minting.rules[hash(groupLabel)].fixedPrice
            ? price = _chapters[hash(groupLabel)].minting.price
            : price = _chapters[_current].minting.price;

        require(!(offer < quantity * price), "MonuverseEpisode: offer rejected");
        _;
    }

    modifier onlyDuringRevealingChapters() {
        require(_chapters[_current].revealing, "MonuverseEpisode: revealing not allowed");
        _;
    }

    modifier couldQuitRevealingChapter() {
        _;
        _emitMonumentalEvent(EpisodeRevealed.selector);
    }

    modifier onlyConfigurationChapter() {
        require(_current == 0x00, "MonuverseEpisode: configuration forbidden");
        _;
    }

    constructor() {
        _branching.setInitial(0x00);
    }

    function writeChapter(
        string calldata label,
        bool whitelisting,
        uint256 allocation,
        uint256 price,
        bool revealing
    ) external onlyOwner onlyConfigurationChapter {
        bytes32 id = hash(label);

        _chapters[id].whitelisting = whitelisting;
        _chapters[id].revealing = revealing;
        _chapters[id].minting.limit = allocation;
        _chapters[id].minting.price = price;

        emit ChapterWritten(label, whitelisting, allocation, price, revealing);
    }

    /// @dev ensure that all chapter-related branching transitions have been removed before
    function removeChapter(string calldata label) external onlyOwner onlyConfigurationChapter {
        delete _chapters[hash(label)];
        emit ChapterRemoved(label);
    }

    function writeChapterMintingGroup(
        string calldata label,
        string calldata groupLabel,
        MintingGroupRules calldata mintingRules
    ) external onlyOwner onlyConfigurationChapter {
        require(_chapters[_current].minting.limit > 0, "MonuverseEpisode: minting not set");

        _chapters[hash(label)].minting.rules[hash(groupLabel)] = mintingRules;
        emit ChapterMintingGroupWritten(label, groupLabel, mintingRules.fixedPrice);
    }

    function removeChapterMintingGroup(string calldata label, string calldata groupLabel)
        external
        onlyOwner
        onlyConfigurationChapter
    {
        delete _chapters[hash(label)].minting.rules[hash(groupLabel)];
        emit ChapterMintingGroupRemoved(label, groupLabel);
    }

    function writeBranchingTransition(
        string calldata from,
        string calldata to,
        string calldata storyEvent
    ) external onlyOwner onlyConfigurationChapter {
        _branching.addTransition(
            hash(from),
            hash(to),
            keccak256(abi.encodePacked(storyEvent, "(bytes32,bytes32)"))
        );
    }

    function removeBranchingTransition(bytes32 from, string calldata storyEvent)
        external
        onlyOwner
        onlyConfigurationChapter
    {
        _branching.removeTransition(from, hash(storyEvent));
    }

    function _tryTransition(bytes32 symbol) private returns (bytes32, bytes32) {
        bytes32 aux = _branching.transition(_current, symbol);

        if (_current != aux) {
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

    function _currentMintLimit() internal view returns (uint256) {
        return _chapters[_current].minting.limit;
    }

    function hash(string calldata str) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(str));
    }
}

// This single require checks for two conditions at once:
// (a) if minting allowed at all (current chapter allocation > 0), and
// (b) if current chapter allocation is full (i.e. no chapter transition occurred)

// require(_chapters[_current].minting.limit > supply, "MonuverseEpisode: minting not allowed");
