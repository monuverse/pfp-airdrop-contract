// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./DFA.sol";

contract MonuverseCollectionStory {
    using DFA for DFA.Dfa;

    struct MintRule {
        bool disabled;
        bool fixedPrice;
    }

    struct Minting {
        uint256 allocation;
        uint256 price;
        mapping(bytes32 => MintRule) rules;
    }

    struct Chapter {
        string label;
        bool whitelisting;
        Minting minting;
        bool revealing;
    }

    /// @notice A collection has a story made of chapters
    DFA.Dfa private _story;

    /// @notice Each chapter enables the collection to perform in a desired manner
    mapping(bytes32 => Chapter) private _chapters;

    bytes32 private _current;

    event AllocationMinted(bytes32 prev, bytes32 current);

    event CollectionRevealed(bytes32 prev, bytes32 current);

    modifier alongMintingChapter() {
        require(_chapters[_current].minting.allocation != 0, "MCStory: minting not allowed");
        _;
    }

    modifier couldCloseMintingChapter() {
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
