// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./IMonuverseCollectionStory.sol";
import "./DFA.sol";

abstract contract MonuverseCollectionStory is IMonuverseCollectionStory {
    using DFA for DFA.Dfa;

    /// @notice A collection has a story made of chapters
    DFA.Dfa private _story;

    /// @notice Each chapter enables the collection to perform in a desired manner
    mapping(bytes32 => Chapter) private _chapters;

    bytes32 private _current;

    modifier mintingChaptersOnly() {
        require(_chapters[_current].minting.allocation > 0, "MCStory: minting not allowed");
        _;
    }

    modifier mintingAllocation(uint256 minted, uint256 quantity, bytes32 group) {
        if (!_chapters[_current].minting.rules[group].fixedPrice) {
        }
        _;
    }

    modifier couldCloseMintingChapter(uint256 minted) {
        _;
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
