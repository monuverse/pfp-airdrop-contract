// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../MonuverseEpisode.sol";

contract MonuverseEpisodeMock is MonuverseEpisode {
    constructor(string memory initial_) MonuverseEpisode(initial_) {}

    function emitMonumentalEvent(bytes32 selector) external {
        return MonuverseEpisode._emitMonumentalEvent(selector);
    }

    function chapterAllowsMint(uint256 quantity, uint256 minted) external view returns (bool) {
        return MonuverseEpisode._chapterAllowsMint(quantity, minted);
    }

    function chapterAllowsOpenMint() internal view returns (bool) {
        return MonuverseEpisode._chapterAllowsOpenMint();
    }

    function chapterAllowsMintGroup(bytes32 group) internal view returns (bool) {
        return MonuverseEpisode._chapterAllowsMintGroup(group);
    }

    function chapterMatchesOffer(
        uint256 quantity,
        uint256 offer,
        bytes32 birth
    ) internal view returns (bool) {
        return MonuverseEpisode._chapterMatchesOffer(quantity, offer, birth);
    }

    function chapterMintLimit() internal view returns (uint256) {
        return MonuverseEpisode._chapterMintLimit();
    }
}
