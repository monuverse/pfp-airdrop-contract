// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./IMonuverseEpisode.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "./DFA.sol";

contract MonuverseEpisode is IMonuverseEpisode, Ownable, Pausable {
    using DFA for DFA.Dfa;

    /// @dev Episode Chapters
    mapping(bytes32 => Chapter) private _chapters;

    /// @dev Episode story Branching
    DFA.Dfa private _branching;

    /// @dev Current Chapter
    bytes32 private _current;

    modifier onlyInitialChapter() {
        require(_current == _branching.initial(), "MonuverseEpisode: updates forbidden");
        _;
    }

    modifier onlyWhitelistingChapter() {
        require(_chapters[_current].whitelisting, "MonuverseEpisode: whitelisting not allowed");
        _;
    }

    modifier onlyMintChapter() {
        require(_chapters[_current].minting.limit > 0, "MonuverseEpisode: mint not allowed");
        _;
    }

    modifier onlyRevealChapter() {
        require(_chapters[_current].revealing, "MonuverseEpisode: reveal not allowed");
        _;
    }

    modifier onlyFinalChapter() {
        require(_branching.isAccepting(_current), "MonuverseEpisode: chapter not final");
        _;
    }

    modifier emitsEpisodeRevealedEvent() {
        _;
        _emitMonumentalEvent(EpisodeRevealed.selector);
    }

    constructor(string memory initial_) {
        _current = writeChapter(initial_, false, 0, 0, false, false);
        _branching.setInitial(_current);
    }

    function writeChapter(
        string memory label,
        bool whitelisting,
        uint256 mintAllocation,
        uint256 mintPrice,
        bool mintOpen,
        bool revealing
    ) public onlyOwner onlyInitialChapter returns (bytes32) {
        require(
            !(revealing && mintAllocation > 0),
            "MonuverseEpisode: reveal with mint forbidden"
        );
        // Still possible to insert mint chapter after reveal chapter since DFAs don't
        // have state order guarantees, make mint function check for occured reveal

        _chapters[_hash(label)].whitelisting = whitelisting;
        _chapters[_hash(label)].minting.limit = mintAllocation;
        _chapters[_hash(label)].minting.price = mintPrice;
        _chapters[_hash(label)].minting.isOpen = true;
        _chapters[_hash(label)].revealing = revealing;
        _chapters[_hash(label)].exists = true;

        emit ChapterWritten(label, whitelisting, mintAllocation, mintPrice, mintOpen, revealing);

        return _hash(label);
    }

    /// @dev Chapter-related transitions should be separately removed before.
    /// @dev MintGroupRules should be removed separately before.
    function removeChapter(string calldata label) external onlyOwner onlyInitialChapter {
        require(_branching.initial() != _hash(label), "MonuverseEpisode: initial non deletable");

        delete _chapters[_hash(label)];

        emit ChapterRemoved(label);
    }

    function writeMintGroup(
        string calldata chapter,
        string calldata group,
        MintGroupRules calldata mintRules
    ) external onlyOwner onlyInitialChapter {
        require(_chapters[_hash(group)].exists, "MonuverseEpisode: group non existent");
        require(
            _chapters[_hash(chapter)].minting.limit > 0,
            "MonuverseEpisode: chapter mint disabled"
        );

        _chapters[_hash(chapter)].minting.rules[_hash(group)] = mintRules;

        emit MintGroupWritten(chapter, group, mintRules.fixedPrice);
    }

    function removeMintGroup(string calldata chapter, string calldata group)
        external
        onlyOwner
        onlyInitialChapter
    {
        delete _chapters[_hash(chapter)].minting.rules[_hash(group)];

        emit MintGroupRemoved(chapter, group);
    }

    function writeTransition(
        string calldata from,
        string calldata to,
        string calldata monumentalEvent
    ) external onlyOwner onlyInitialChapter {
        require(_chapters[_hash(from)].exists, "MonuverseEpisode: from not set");
        require(_chapters[_hash(to)].exists, "MonuverseEpisode: to not set");

        _branching.addTransition(
            _hash(from),
            _hash(to),
            keccak256(abi.encodePacked(monumentalEvent, "(bytes32,bytes32)"))
        );

        emit TransitionWritten(from, to, monumentalEvent);
    }

    function removeTransition(string calldata from, string calldata monumentalEvent)
        external
        onlyOwner
        onlyInitialChapter
    {
        _branching.removeTransition(_hash(from), _hash(monumentalEvent));

        emit TransitionRemoved(from, monumentalEvent);
    }

    function emitOnlifeEvent() public onlyOwner {
        _emitMonumentalEvent(EpisodeProgressedOnlife.selector);
    }

    /// @dev `aux` equals `_current` when transition destination is same as origin,
    /// @dev `aux` equals `_current` also when no transition has been specified,
    /// @dev (to prevent user from seeing its tx reverted)
    /// @return aux previous state, 0x00 if no transition exists
    /// @return _current new current post-transition state
    function _tryTransition(bytes32 symbol) private returns (bytes32, bytes32) {
        bytes32 aux = _branching.transition(_current, symbol);

        if (_current != aux && aux != 0x00) {
            (_current, aux) = (aux, _current);
        }

        return (aux, _current);
    }

    function _emitMonumentalEvent(bytes32 selector) internal whenNotPaused {
        (bytes32 prev, bytes32 current) = _tryTransition(selector);

        if (selector == ChapterMinted.selector) {
            emit ChapterMinted(prev, current);
        } else if (selector == EpisodeProgressedOnlife.selector) {
            emit EpisodeProgressedOnlife(prev, current);
        } else if (selector == EpisodeMinted.selector) {
            emit EpisodeMinted(prev, current);
        } else if (selector == EpisodeRevealed.selector) {
            emit EpisodeRevealed(prev, current);
        } else {
            revert("MonuverseEpisode: event non existent");
        }
    }

    function initialChapter() public view returns (bytes32) {
        return _branching.initial();
    }

    function currentChapter() public view returns (bytes32) {
        return _current;
    }

    function mintGroup(string calldata label, string calldata group)
        public
        view
        returns (bool, bool)
    {
        return (
            _chapters[_hash(label)].minting.rules[_hash(group)].enabled,
            _chapters[_hash(label)].minting.rules[_hash(group)].fixedPrice
        );
    }

    function _chapterAllowsMint(uint256 quantity, uint256 minted) internal view returns (bool) {
        // This single require checks for two conditions at once:
        // (a) if minting allowed at all (current chapter allocation > 0), and
        // (b) if current available chapter allocation is not enough for quantity
        return minted + quantity <= _chapters[_current].minting.limit;
    }

    function _chapterAllowsOpenMint() internal view returns (bool) {
        // This single require checks for two conditions at once:
        // (a) if minting allowed at all (current chapter allocation > 0), and
        // (b) if current available chapter allocation is not enough for quantity
        return _chapters[_current].minting.isOpen;
    }

    // true if is born now, is explicitly allowed to mint, is public minting allowed
    function _chapterAllowsMintGroup(bytes32 group) internal view returns (bool) {
        return
            group == _current ||
            _chapters[_current].minting.isOpen ||
            _chapters[_current].minting.rules[group].enabled;
    }

    function _chapterMatchesOffer(
        uint256 quantity,
        uint256 offer,
        bytes32 birth
    ) internal view returns (bool) {
        uint256 price;
        _chapters[_current].minting.rules[birth].fixedPrice
            ? price = _chapters[birth].minting.price
            : price = _chapters[_current].minting.price;

        return quantity * price >= offer;
    }

    function _chapterMintLimit() internal view returns (uint256) {
        return _chapters[_current].minting.limit;
    }

    function _hash(string memory str) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(str));
    }
}
