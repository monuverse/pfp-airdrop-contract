// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./IMonuverseCollectionStory.sol";
import "./DFA.sol";

contract MonuverseCollectionStory is IMonuverseCollectionStory {
    using DFA for DFA.Dfa;

    /// @notice A collection has a story made of chapters
    DFA.Dfa private _story;

    /// @notice Each chapter enables the collection to perform in a desired manner
    mapping(bytes32 => Chapter) private _chapters;

    /// @notice Story is running if current chapter isn't default value 0x00
    bytes32 private _current;

    /// @notice Forbids minting if current chapter has allocation set to default value 0
    /// @notice Forbids minting if pre-mint supply exceeds current chapter allocation
    /// @notice Forbids minting if post-mint supply exceeds maximum collection supply
    /// @notice Allows minting if post-mint supply exceeds current chapter allocation
    /// @param supply current token supply
    /// @param quantity disired quantity to be minted by user
    /// @param maxSupply maximum token supply to be reached by the collection, 0 if there is none
    modifier constrainedByMintingChapters(
        uint256 supply,
        uint256 quantity,
        uint256 maxSupply
    ) {
        uint256 chapterAllocation = _chapters[_current].minting.allocation;
        uint256 postMintSupply = supply + quantity;

        // This single require checks for two conditions at once:
        // (a) if minting allowed at all (current chapter allocation > 0), and
        // (b) if current chapter allocation is already full
        require(chapterAllocation > supply, "MCStory: minting not allowed");

        if (maxSupply > 0) {
            require(postMintSupply < maxSupply);
        }

        _;

        // If desired quantity exceeds chapter allocation, user should pay more
        // for increasing token price but is free of extra charge, in exchange
        // user spends more gas to transition to next chapter and benefit the story
        if (postMintSupply > chapterAllocation) {
            bytes32 prev = _current;
            bytes32 current = _story.transition(prev, ChapterAllocationMinted.selector);

            if (prev != current) {
                _current = current;
            }

            // prev == current if no DFA transition has been specified
            emit ChapterAllocationMinted(prev, current);
        }
    }

    modifier alongRevealingChapter() {
        require(_chapters[_current].revealing, "MCStory: revealing not allowed");
        _;
    }

    modifier couldCloseRevealingChapter() {
        _;

        bytes32 prev = _current;
        bytes32 current = _story.transition(prev, CollectionRevealed.selector);

        if (prev != current) {
            _current = current;
        }

        emit CollectionRevealed(prev, current);
    }
}
