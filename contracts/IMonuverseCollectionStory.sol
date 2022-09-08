// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IMonuverseCollectionStory {
    struct MintingGroupRules {
        bool enabled;
        bool fixedPrice;
    }

    struct Minting {
        uint256 allocation;
        uint256 price;
        mapping(bytes32 => MintingGroupRules) rules;
    }

    struct Chapter {
        Minting minting;
        bool whitelisting;
        bool revealing;
    }

    /// @notice Story Configuration Events
    event ChapterWritten(
        string label,
        bool whitelisting,
        bool revealing,
        uint256 allocation,
        uint256 price
    );
    event ChapterRemoved(string label);
    event ChapterMintingGroupWritten(string label, string groupLabel, bool fixedPrice);
    event ChapterMintingGroupRemoved(string label, string groupLabel);

    /// @notice Story State-Transitioning Events
    event ChapterAllocationMinted(bytes32 prev, bytes32 current);
    event CollectionRevealed(bytes32 prev, bytes32 current);

    function writeChapter(
        string calldata label,
        bool whitelisting,
        bool revealing,
        uint256 allocation,
        uint256 price
    ) external;

    function removeChapter(string calldata label) external;

    /// @notice 0x00 is the label of the public
    function writeChapterMintingGroup(
        string calldata label,
        string calldata groupLabel,
        MintingGroupRules calldata mintingRules
    ) external;

    function removeChapterMintingGroup(string calldata label, string calldata groupLabel) external;
}
