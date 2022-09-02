// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


/// @dev importing constructor must create and set state as initial

/// @dev Each existing state is a valid state, including 0x00
/// @dev Each added transition is a valid transition
/// @dev DFA correctness and minimization has to be evaluated off-chain


library DFA {
    struct Dfa {
        bytes32 initial;
        mapping(bytes32 => bool) accepting;
        mapping(bytes32 => mapping(bytes32 => bytes32)) transitions;
    }

    function addTransition(Dfa storage self, bytes32 from, bytes32 to, bytes32 symbol) internal {
        require(
            self.transitions[from][symbol] == 0x00,
            "DFA: transition already existing"
        );

        self.transitions[from][symbol] = to;
    }

    function removeTransition(Dfa storage self, bytes32 from, bytes32 symbol) internal {
        delete self.transitions[from][symbol];
    }

    function setInitial(Dfa storage self, bytes32 state) internal {
        self.initial = state;
    }

    function addAccepting(Dfa storage self, bytes32 state) internal {
        self.accepting[state] = true;
    }

    function removeAccepting(Dfa storage self, bytes32 state) internal {
        delete self.accepting[state];
    }

    function transition(Dfa storage self, bytes32 from, bytes32 symbol) internal view returns (bytes32) {
        bytes32 next = self.transitions[from][symbol];

        if (next == 0x00) {
            next = from;
        }

        return next;
    }

    function isAccepting(Dfa storage self, bytes32 state) internal view returns (bool) {
        return self.accepting[state];
    }

    function initial(Dfa storage self) internal view returns (bytes32) {
        return self.initial;
    }
}
