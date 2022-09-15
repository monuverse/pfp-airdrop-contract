// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "../DFA.sol";

contract DFAMock {
    using DFA for DFA.Dfa;

    DFA.Dfa private _dfa;

    bytes32 private _current;

    mapping(bytes32 => uint256) private _states;

    constructor(uint256 init) {
        _current = createState(init);
        _dfa.setInitial(_current);
    }

    function createState(uint256 value) public returns (bytes32) {
        _states[hash(value)] = value;

        return hash(value);
    }

    function addTransition(
        bytes32 from,
        bytes32 to,
        bytes32 symbol
    ) public {
        // NOTE: different from requires inside library, here
        // it is required to set states before creating transtions
        // require(_states[from] != 0, "DFAMock: from not set");
        // require(_states[to] != 0, "DFAMock: to not set");

        _dfa.addTransition(from, to, symbol);
    }

    function removeTransition(bytes32 from, bytes32 symbol) public {
        _dfa.removeTransition(from, symbol);
    }

    function addAccepting(bytes32 state) public {
        _dfa.addAccepting(state);
    }

    function removeAccepting(bytes32 state) public {
        _dfa.removeAccepting(state);
    }

    function transition(bytes32 symbol) public returns (bytes32) {
        _current = destination(_current, symbol);

        return _current;
    }

    function reset() public returns (bytes32) {
        _current = _dfa.initial();

        return _current;
    }

    function destination(bytes32 from, bytes32 symbol) public view returns (bytes32) {
        require(_dfa.transition(from, symbol) != 0x00, "DFAMock: transition non existent");

        return _dfa.transition(from, symbol);
    }

    function stateValue(bytes32 state) public view returns(uint256) {
        return _states[state];
    }

    function current() public view returns (bytes32) {
        return _current;
    }

    function isAccepting(bytes32 state) public view returns (bool) {
        return _dfa.isAccepting(state);
    }

    function initial() public view returns (bytes32) {
        return _dfa.initial();
    }

    function hash(uint256 value) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(value));
    }
}
