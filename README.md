# Arch Of Peace Episode

Arch of Peace is a Monuverse Collection with on-chain programmable lifecycle and, regardless of collection size, O(1) fully decentralized and unpredictable reveal.

Key Points:
 * a Collection is called Episode and has a lifecycle that is composed of Chapters;
 * each Chapter selectively enables contract features and emits so called Monumental Events (special Solidity events);
 * each Monumental Event can make the Episode transition into a new Chapter;
 * each transition follows the on-chain programmable story branching;
 * episode branching is a configurable Deterministic Finite Automata.

## Episode Lifecycle

![](./episode.png)

## Lifecycle Description

### Arch of Peace Episode Chapters
 * `Introduction: The Big Bang`, Episode (DFA) configuration Chapter
 * `Chapter I: The Arch Builders`, Minting Chapter
 * `Chapter II: The Chosen Ones`, Minting Chapter
 * `Chapter III: The Believers`, Minting Chapter
 * `Chapter IV: The Brave`, Minting Chapter
 * `Chapter V: The Wild Age`, Secondary Market Chapter
 * `Chapter VI: The Great Reveal`, Reveal Chapter
 * `Conclusion: Monuverse`, Final Chapter

### Arch of Peace Monumental Events
 * `ChapterMinted`, a Chapter token allocation has been minted
 * `MintingSealed`, minting has been manually closed forever by Monuverse
 * `EpisodeMinted`, minting has been automatically closed forever due to sold out
 * `EpisodeRevealed`, NFT's have been revealed (i.e. VRF Coordinator fulfilled request)
 * `EpisodeProgressedOnlife`, offchain event manually triggered

## Other

### Project Template Commands

```shell
npx hardhat help
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```
