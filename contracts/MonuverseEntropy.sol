// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./MonuverseCollectionStory.sol";

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract MonuverseEntropy is MonuverseCollectionStory, VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface private immutable _coordinator;

    struct VRFRequestParams {
        bytes32 gasLane;
        uint64 subscriptionId;
        uint16 requestConfirmations;
        uint32 callbackGasLimit;
        uint32 numWords;
    }

    VRFRequestParams private _vrfRequestParams;
    uint256 private _seed;

    event RandomnessRequested(uint256 requestId);

    constructor(
        address coordinator_,
        bytes32 gasLane_,
        uint64 subscriptionId_
    ) VRFConsumerBaseV2(coordinator_) {
        _seed = 0;
        _coordinator = VRFCoordinatorV2Interface(coordinator_);
        _vrfRequestParams = VRFRequestParams(gasLane_, subscriptionId_, 5, 300000, 1);
    }

    /// @notice Assumes the subscription is set sufficiently funded
    function _requestRandomWord() internal {
        uint256 requestId = _coordinator.requestRandomWords(
            _vrfRequestParams.gasLane,
            _vrfRequestParams.subscriptionId,
            _vrfRequestParams.requestConfirmations,
            _vrfRequestParams.callbackGasLimit,
            _vrfRequestParams.numWords
        );

        emit RandomnessRequested(requestId);
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override couldQuitRevealingChapter {
        _seed = randomWords[0];
    }

    function updateVRFParams(
        bytes32 gasLane,
        uint64 subscriptionId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) public onlyOwner {
        _vrfRequestParams.gasLane = gasLane;
        _vrfRequestParams.subscriptionId = subscriptionId;
        _vrfRequestParams.requestConfirmations = requestConfirmations;
        _vrfRequestParams.callbackGasLimit = callbackGasLimit;
        _vrfRequestParams.numWords = numWords;
    }

    function seed() internal view returns (uint256) {
        return _seed;
    }
}
