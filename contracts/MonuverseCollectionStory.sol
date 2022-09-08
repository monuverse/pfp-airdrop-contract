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

    /// @notice Forbids minting if current chapter has allocation set to default value 0
    /// @notice Forbids minting if pre-mint supply exceeds current chapter allocation
    /// @notice Allows minting if post-mint supply exceeds current chapter allocation
    /// @param supply current token supply
    /// @param quantity disired quantity to be minted by user
    modifier onlyDuringMintingChapters(uint256 supply, uint256 quantity) {
        // This single require checks for two conditions at once:
        // (a) if minting allowed at all (current chapter allocation > 0), and
        // (b) if current chapter allocation is full (i.e. no chapter transition occurred)
        require(_chapters[_current].minting.allocation > supply, "MCStory: minting not allowed");

        _;
    }

    modifier onlyCurrentMintingGroups(string calldata group) {
        require(
            _chapters[_current].minting.rules[hash(group)].enabled,
            "MCStory: group not enabled"
        );

        _;
    }

    modifier onlyCurrentPriceMatches(
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

    modifier couldQuitMintingChapter(
        uint256 supply,
        uint256 quantity
    ) {
        _;

        if (supply + quantity > _chapters[_current].minting.allocation) {
            bytes32 prev = _current;
            bytes32 current = _story.transition(prev, ChapterAllocationMinted.selector);

            if (prev != current) {
                _current = current;
            }

            // `prev` equals `current` if no transition occurred
            emit ChapterAllocationMinted(prev, current);
        }
    }

    modifier onlyDuringRevealingChapters() {
        require(_chapters[_current].revealing, "MCStory: revealing not allowed");
        _;
    }

    modifier couldQuitRevealingChapter() {
        _;

        bytes32 prev = _current;
        bytes32 current = _story.transition(prev, CollectionRevealed.selector);

        if (prev != current) {
            _current = current;
        }

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

    function hash(string calldata str) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(str));
    }
}

// onlyWhitelisted
// onlyDuringMintingChapters(supply, quantity, maxSupply)
// onlyCurrentMintingGroups(group)
// onlyCurrentPriceMatches
// couldQuitMintingChapter(supply, quantity, maxSupply)

// isMintingCurrentlyAllowed(label)
// isMintingGroupCurrentlyAllowed(label)

// function mint(uint256 quantity)
//     external
//     payable
//     onlyWhitelsited()
// {
//     require(story._isMintingChapterNow(), "AoP: minting disabled");
//     require(story._isMintingGroupAllowedNow());
//     require(story._isFundingSufficientNow());

//     super._safeMint(msg.sender, quantity);

//     story._eventuallyQuit
// }
