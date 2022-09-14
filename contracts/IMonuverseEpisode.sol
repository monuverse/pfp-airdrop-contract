// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IMonuverseEpisode {
    struct MintingGroupRules {
        bool enabled;
        bool fixedPrice;
    }

    struct Minting {
        uint256 limit;
        uint256 price;
        mapping(bytes32 => MintingGroupRules) rules;
    }

    struct Chapter {
        Minting minting;
        bool whitelisting;
        bool revealing;
    }

    /// @notice Episode writing events
    event ChapterWritten(
        string label,
        bool whitelisting,
        uint256 allocation,
        uint256 price,
        bool revealing
    );
    event ChapterRemoved(string label);
    event ChapterMintingGroupWritten(string label, string groupLabel, bool fixedPrice);
    event ChapterMintingGroupRemoved(string label, string groupLabel);

    /// @notice Episode chapter-transitioning events
    event ChapterMinted(bytes32 prev, bytes32 current);
    event EpisodeMinted(bytes32 prev, bytes32 current);
    event EpisodeRevealed(bytes32 prev, bytes32 current);
    event ManuallyTransitioned(bytes32 prev, bytes32 current);

    function writeChapter(
        string calldata label,
        bool whitelisting,
        uint256 allocation,
        uint256 price,
        bool revealing
    ) external;

    function removeChapter(string calldata label) external;

    function writeChapterMintingGroup(
        string calldata label,
        string calldata groupLabel,
        MintingGroupRules calldata mintingRules
    ) external;

    function removeChapterMintingGroup(string calldata label, string calldata groupLabel) external;

    function writeBranchingTransition(
        string calldata from,
        string calldata to,
        string calldata storyEvent
    ) external;

    function removeBranchingTransition(bytes32 from, string calldata storyEvent) external;
}
