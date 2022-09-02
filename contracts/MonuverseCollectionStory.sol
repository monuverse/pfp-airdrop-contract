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

    struct Epoch {
        string label;
        bool configuring;
        bool whitelisting;
        Minting minting;
        bool revealing;
    }

    /// @notice A collection has a story made of epochs
    DFA.Dfa private _story;

    /// @notice Each epoch enables the collection to perform in a desired manner
    mapping(bytes32 => Epoch) private _epochs;

    bytes32 private _current;

    event CollectionMinted(bytes32 prev, bytes32 current);
    event CollectionRevealed(bytes32 prev, bytes32 current);

    modifier canCloseEpochByReveal() {
        _;
        if (_epochs[_current].revealing) {
            bytes32 prev = _current;
            bytes32 current = _story.transition(_current, CollectionRevealed.selector);

            if (prev != current) {
                _current = current;
            }

            emit CollectionRevealed(prev, current);
        }
    }
}