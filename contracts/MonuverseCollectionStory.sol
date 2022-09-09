// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./IMonuverseCollectionStory.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

import "./DFA.sol";

contract MonuverseCollectionStory is IMonuverseCollectionStory, Ownable {
    using DFA for DFA.Dfa;

    /// @notice A collection has a story made of chapters
    DFA.Dfa private _story;

    /// @notice Each chapter enables the collection to perform in a desired manner
    mapping(bytes32 => Chapter) private _chapters;

    /// @notice Story is running if current chapter isn't default value 0x00
    bytes32 private _current;

    modifier onlyDuringMintingChapters() {
        // This single require checks for two conditions at once:
        // (a) if minting allowed at all (current chapter allocation > 0), and
        // (b) if current chapter allocation is full (i.e. no chapter transition occurred)
        // require(_chapters[_current].minting.allocation > supply, "MCStory: minting not allowed");
        require(_chapters[_current].minting.allocation > 0, "MCStory: minting not allowed");

        _;
    }

    modifier onlyChapterMintingGroups(string calldata group) {
        require(
            _chapters[_current].minting.rules[hash(group)].enabled,
            "MCStory: group not enabled"
        );

        _;
    }

    modifier onlyChapterMatchingPrices(
        string calldata groupLabel,
        uint256 quantity,
        uint256 offer
    ) {
        bytes32 group = hash(groupLabel);
        uint256 price;

        _chapters[_current].minting.rules[group].fixedPrice
            ? price = _chapters[group].minting.price
            : price = _chapters[_current].minting.price;

        require(quantity * price >= offer, "MCStory: offer rejected");

        _;
    }

    modifier willTryChapterExitWhenAllocationMinted(uint256 supply, uint256 quantity) {
        require(_chapters[_current].minting.allocation > 0, "MCStory: minting not allowed");

        if (!(_chapters[_current].minting.allocation > supply + quantity)) {
            quantity = _chapters[_current].minting.allocation - supply;
        }

        _;

        // BUG
        if (!(supply + quantity < _chapters[_current].minting.allocation)) {
            (bytes32 prev, bytes32 current) = tryTransition(ChapterAllocationMinted.selector);
            emit ChapterAllocationMinted(prev, current);
        }
    }

    function _tryQuitMintingChapter() internal {
        (bytes32 prev, bytes32 current) = tryTransition(ChapterAllocationMinted.selector);
        emit ChapterAllocationMinted(prev, current);
    }

    modifier onlyDuringRevealingChapters() {
        require(_chapters[_current].revealing, "MCStory: revealing not allowed");
        _;
    }

    modifier couldQuitRevealingChapter() {
        _;

        (bytes32 prev, bytes32 current) = tryTransition(CollectionRevealed.selector);
        emit CollectionRevealed(prev, current);
    }

    modifier onlyInitialState() {
        require(_current == 0x00, "MCStory: story is running");
        _;
    }

    constructor() {
        _story.setInitial(0x00);
    }

    function writeChapter(
        string calldata label,
        bool whitelisting,
        bool revealing,
        uint256 allocation,
        uint256 price
    ) external onlyOwner onlyInitialState {
        bytes32 id = hash(label);

        _chapters[id].whitelisting = whitelisting;
        _chapters[id].revealing = revealing;
        _chapters[id].minting.allocation = allocation;
        _chapters[id].minting.price = price;

        emit ChapterWritten(label, whitelisting, revealing, allocation, price);
    }

    function removeChapter(string calldata label) external onlyOwner onlyInitialState {
        delete _chapters[hash(label)];
        emit ChapterRemoved(label);
    }

    function writeChapterMintingGroup(
        string calldata label,
        string calldata groupLabel,
        MintingGroupRules calldata mintingRules
    ) external onlyOwner onlyInitialState {
        require(_chapters[_current].minting.allocation > 0, "MCStory: minting not set");

        _chapters[hash(label)].minting.rules[hash(groupLabel)] = mintingRules;
        emit ChapterMintingGroupWritten(label, groupLabel, mintingRules.fixedPrice);
    }

    function removeChapterMintingGroup(string calldata label, string calldata groupLabel)
        external
        onlyOwner
        onlyInitialState
    {
        delete _chapters[hash(label)].minting.rules[hash(groupLabel)];
        emit ChapterMintingGroupRemoved(label, groupLabel);
    }

    function tryTransition(bytes32 transitionEvent) private returns (bytes32, bytes32) {
        bytes32 aux = _story.transition(_current, transitionEvent);

        if (_current != aux) {
            (_current, aux) = (aux, _current);
        }

        return (aux, _current);
    }

    function _availableAllocation(uint256 minted) internal view returns (uint256) {
        return _chapters[_current].minting.allocation - minted;
    }

    function hash(string calldata str) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(str));
    }
}
