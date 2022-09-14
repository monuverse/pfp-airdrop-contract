import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract } from 'ethers';

type Transition = {
    from: number;
    to: number;
    symbol: string;
};

const hashNum = (value: number) => {
    return ethers.utils.solidityKeccak256(['uint256'], [value]);
};

const hashStr = (value: string) => {
    return ethers.utils.solidityKeccak256(['string'], [value]);
};

describe('Deterministic Finite Automata Library', () => {
    let dfa: Contract;

    // DFA for accepting strings starting and ending with different character
    const initial: number = 0;
    const states: Array<number> = [0, 1, 2, 3, 4];
    const alphabet: Array<string> = ['a', 'b'];
    const transitions: Transition[] = [
        { from: 0, to: 1, symbol: 'a' },
        { from: 1, to: 1, symbol: 'a' },
        { from: 1, to: 2, symbol: 'b' },
        { from: 2, to: 2, symbol: 'b' },
        { from: 2, to: 1, symbol: 'a' },
        { from: 0, to: 3, symbol: 'b' },
        { from: 3, to: 3, symbol: 'b' },
        { from: 3, to: 4, symbol: 'a' },
        { from: 4, to: 4, symbol: 'a' },
        { from: 4, to: 3, symbol: 'b' },
    ];
    const final: Array<number> = [2, 4];
    const accepted: Array<string> = ['aabbabab', 'bba', 'abbab'];
    const rejected: Array<string> = ['aba', 'baab', 'baabbabab'];

    before(async () => {
        const DFA = await ethers.getContractFactory('DFAMock');
        dfa = await DFA.deploy(states[0]);
        await dfa.deployed();
    });

    it('MUST successfully deploy with correct initial state', async () => {
        expect(await dfa.initial()).to.equal(await dfa.hash(states[0]));
    });

    it('MUST successfully set all states (mock)', async () => {
        states.forEach(async (state) => {
            await (await dfa.createState(state)).wait();

            expect(await dfa.stateValue(await dfa.hash(state))).to.equal(state);
        });
    });

    it('MUST NOT add transitions with source or destination state as default value 0x00', async () => {
        await expect(
            dfa.addTransition(
                ethers.constants.HashZero,
                hashNum(1),
                hashStr('a')
            )
        ).to.be.rejectedWith('DFA: from invalid');

        await expect(
            dfa.addTransition(
                hashNum(1),
                ethers.constants.HashZero,
                hashStr('a')
            )
        ).to.be.rejectedWith('DFA: to invalid');
    });

    it('MUST set states as final', async () => {
        final.forEach(async (state) => {
            await (await dfa.addAccepting(hashNum(state))).wait();

            expect(await dfa.isAccepting(hashNum(state))).to.be.true;
        });
    });

    it('MUST successfully add all DFA transitions (lib)', async () => {
        transitions.forEach(async (transition) => {
            const { from, to, symbol } = transition;
            await (
                await dfa.addTransition(
                    hashNum(from),
                    hashNum(to),
                    hashStr(symbol)
                )
            ).wait();

            expect(
                await dfa.destination(hashNum(from), hashStr(symbol))
            ).to.equal(hashNum(to));
        });
    });

    it('MUST end in final state when consuming accepted string', async () => {
        let hashedFinal: Array<string> = final.map((state) => hashNum(state));

        for (let i: number = 0; i < accepted.length; i++) {
            const symbols = [...accepted[i]];

            expect(await dfa.current()).to.equal(await dfa.initial());

            for (let j: number = 0; j < symbols.length; j++) {
                await (await dfa.transition(hashStr(symbols[j]))).wait();
            }

            expect(hashedFinal).to.include(await dfa.current());

            await (await dfa.reset()).wait();
        }
    });

    it('MUST NOT end in final state when consuming non accepted string', async () => {
        let hashedFinal: Array<string> = final.map((state) => hashNum(state));

        for (let i: number = 0; i < rejected.length; i++) {
            const symbols = [...rejected[i]];

            expect(await dfa.current()).to.equal(await dfa.initial());

            for (let j: number = 0; j < symbols.length; j++) {
                await (await dfa.transition(hashStr(symbols[j]))).wait();
            }

            expect(hashedFinal).to.not.include(await dfa.current());

            await (await dfa.reset()).wait();
        }
    });
});
