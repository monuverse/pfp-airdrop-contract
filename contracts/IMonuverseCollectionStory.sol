// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IMonuverseCollectionStory {
    struct MintingGroupRules {
        bool disabled;
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

    /// @notice Story configuration Events
    event ChapterWritten(
        string label,
        bool whitelisting,
        bool revealing,
        uint256 allocation,
        uint256 price
    );
    event ChapterRemoved(string label);
    event ChapterMintingUpdated(string label, uint256 allocation, uint256 price);
    event ChapterMintingGroupUpdated(string label, string groupLabel, bool fixedPrice);

    /// @notice Story narrating Events
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

    function updateChapterMinting(
        string calldata label,
        uint256 allocation,
        uint256 price
    ) external;

    function updateChapterMintingGroup(
        string calldata label,
        string calldata groupLabel,
        bool fixedPrice
    ) external;

    function removeChapterMintingGroup(string calldata label, string calldata groupLabel) external;
}
