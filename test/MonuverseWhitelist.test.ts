/**
 * @author  Maxim Gaina
 * @dev     Assert is used for Pre-conditions,
 *          Expect is used for Post-conditions,
 *          where Pre and Post are referred to the state of the Smartcontract before
 *          and after each test, easy distinction is the only purpose;
 *
 *          Tests resemble the MoSCoW prioritization (MUST, SHOULD, COULD, WILL NOT).
 */

import { assert, expect } from 'chai';

import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { MerkleTree } from 'merkletreejs';
import { keccak256 } from 'ethers/lib/utils';

export type whitelistRecord = {
    account: SignerWithAddress;
    allowance: number;
};

const toWhitelistLeaf = (address: string, allowance: number): Buffer => {
    return Buffer.from(
        ethers.utils
            .solidityKeccak256(['address', 'uint256'], [address, allowance])
            .slice(2),
        'hex'
    );
};

describe('ArchOfPeaceWhitelist Contract', () => {
    // Actors
    let monuverse: SignerWithAddress;
    let chad: whitelistRecord; // chad is always whitelisted
    let hacker: SignerWithAddress; // hacker is always out of the whitelist
    let users: SignerWithAddress[]; // users can enter/exit whitelist during tests

    let whitelist: whitelistRecord[];
    let whitelistTree: MerkleTree;

    const preRevealUri = 'preRevealURI';
    let archOfLight: Contract;

    before(async () => {
        [monuverse, hacker, ...users] = await ethers.getSigners();

        whitelist = users
            .slice(0, 8)
            .map((user) => ({ account: user, allowance: 2 }));

        chad = whitelist[0];

        let whitelistLeaves = whitelist.map((user) =>
            toWhitelistLeaf(user.account.address, user.allowance)
        );

        whitelistTree = new MerkleTree(whitelistLeaves, keccak256, {
            sortPairs: true,
        });

        let whitelistRoot = whitelistTree.getRoot();

        const ArchOfLight = await ethers.getContractFactory('ArchOfPeaceWhitelist');
        archOfLight = await ArchOfLight.deploy();

        await archOfLight.deployed();

        archOfLight.setWhitelistRoot(whitelistRoot);

        const deployedRoot = (await archOfLight.whitelistRoot()).slice(2);
        const offChainRoot = whitelistTree.getRoot().toString('hex');

        assert.equal(
            deployedRoot,
            offChainRoot,
            'Assert Smartcontract has been deployed with initial root'
        );
    });

    it('MUST allow monuverse to verify user Whitelist status with *even* number of leaves', async () => {
        assert.equal(
            whitelistTree.getLeafCount() % 2,
            0,
            'Assert even number of leaves'
        );

        const hexProof = whitelistTree.getHexProof(
            whitelistTree.getLeaves()[0]
        );

        const isWhitelisted = await archOfLight.isAccountWhitelisted(
            whitelist[0].account.address,
            whitelist[0].allowance,
            hexProof
        );

        const hackerIsWhitelisted = await archOfLight.isAccountWhitelisted(
            hacker.address,
            1,
            hexProof
        );

        expect(isWhitelisted).to.equal(true);
        expect(hackerIsWhitelisted).to.equal(false);
    });

    it('MUST *only* allow monuverse to update Whitelist root', async () => {
        assert.isNotEmpty(users, 'Assert there are users left');

        const newWhitelistedUser = users.pop();

        // Ts couldn't care less about initial assert
        if (!newWhitelistedUser) {
            throw new Error('No users left to enter the Whitelist');
        }

        let newWhitelistRecord = {
            account: newWhitelistedUser,
            allowance: 2,
        };
        whitelist.push(newWhitelistRecord);

        const newLeaf = toWhitelistLeaf(
            newWhitelistRecord.account.address,
            newWhitelistRecord.allowance
        );

        const oldRoot = whitelistTree.getRoot();
        const oldOnchainRoot = (await archOfLight.whitelistRoot()).slice(2);

        whitelistTree.addLeaf(newLeaf);
        const newRoot = whitelistTree.getRoot();

        assert.notEqual(oldRoot, newRoot, 'Assert new root is different');
        assert.equal(
            oldRoot.toString('hex'),
            oldOnchainRoot,
            'Assert old onchain and offchain roots are the same'
        );

        await expect(
            archOfLight.connect(hacker).setWhitelistRoot(newRoot)
        ).to.be.revertedWith('Ownable: caller is not the owner');

        await (
            await archOfLight.connect(monuverse).setWhitelistRoot(newRoot)
        ).wait();

        const newOnchainRoot = (await archOfLight.whitelistRoot()).slice(2);

        expect(newOnchainRoot).to.equal(newRoot.toString('hex'));
    });

    it('MUST allow monuverse to verify user Whitelist with *odd* number of leaves', async () => {
        assert.notEqual(
            whitelistTree.getLeafCount() % 2,
            0,
            'Assert odd number of leaves'
        );

        const hexProof = whitelistTree.getHexProof(
            whitelistTree.getLeaves()[0]
        );

        const isWhitelisted = await archOfLight.isAccountWhitelisted(
            whitelist[0].account.address,
            whitelist[0].allowance,
            hexProof
        );

        const hackerIsWhitelisted = await archOfLight.isAccountWhitelisted(
            hacker.address,
            1,
            hexProof
        );

        expect(isWhitelisted).to.equal(true);
        expect(hackerIsWhitelisted).to.equal(false);
    });

    it('MUST allow any Non-owner to check exclusively *its own* whitelist status', async () => {
        const victim = whitelist[0];
        const whitelistedHacker = whitelist[1];

        const victimHexProof = whitelistTree.getHexProof(
            whitelistTree.getLeaves()[0]
        );

        await expect(
            archOfLight
                .connect(hacker)
                .isAccountWhitelisted(
                    victim.account.address,
                    victim.allowance,
                    victimHexProof
                )
        ).to.be.revertedWith('Not allowed to check other users');

        await expect(
            archOfLight
                .connect(whitelistedHacker.account)
                .isAccountWhitelisted(
                    victim.account.address,
                    victim.allowance,
                    victimHexProof
                )
        ).to.be.revertedWith('Not allowed to check other users');

        expect(
            await archOfLight
                .connect(victim.account)
                .isAccountWhitelisted(
                    victim.account.address,
                    victim.allowance,
                    victimHexProof
                )
        ).to.equal(true);

        expect(
            await archOfLight
                .connect(hacker)
                .isAccountWhitelisted(
                    hacker.address,
                    victim.allowance,
                    victimHexProof
                )
        ).to.equal(false);
    });

    it('SHOULD *only* allow Non-monuverse AND whitelisted users to mint');

    it('SHOULD *only* allow minting for sender account');

    it('SHOULD NOT allow monuverse to whitelist itself');
});
