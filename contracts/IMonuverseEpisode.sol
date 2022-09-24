// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IMonuverseEpisode {
    struct MintGroupRules {
        bool enabled;
        bool fixedPrice;
    }

    struct Minting {
        uint256 limit;
        uint256 price;
        mapping(bytes32 => MintGroupRules) rules;
    }

    struct Chapter {
        Minting minting;
        bool whitelisting;
        bool revealing;
        bool exists;
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
    event ChapterMintGroupWritten(string label, string groupLabel, bool fixedPrice);
    event ChapterMintGroupRemoved(string label, string groupLabel);

    /// @notice Special Monumental Events
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
    ) external returns (bytes32);

    function removeChapter(string calldata label) external;

    function writeChapterMintGroup(
        string calldata label,
        string calldata groupLabel,
        MintGroupRules calldata mintingRules
    ) external;

    function removeChapterMintGroup(string calldata label, string calldata groupLabel) external;

    function writeTransition(
        string calldata from,
        string calldata to,
        string calldata storyEvent
    ) external;

    function removeTransition(bytes32 from, string calldata storyEvent) external;
}
