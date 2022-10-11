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

import { whitelistRecord, toWhitelistLeaf, buffHashStr } from './common';

describe('CONTRACT ArchOfPeaceWhitelist', () => {
    let owner: SignerWithAddress;
    let hacker: SignerWithAddress; // always out of the whitelist
    let users: SignerWithAddress[]; // may enter/exit whitelist

    let whitelist: whitelistRecord[];
    let whitelistTree: MerkleTree;

    let archOfPeaceWl: Contract;

    const chapter: Buffer = buffHashStr('builders');

    before(async () => {
        [owner, hacker, ...users] = await ethers.getSigners();

        whitelist = users
            .slice(0, 8)
            .map((user) => ({ account: user, limit: 2, chapter: chapter }));

        let whitelistLeaves = whitelist.map((user) =>
            toWhitelistLeaf(user.account.address, user.limit, user.chapter)
        );

        whitelistTree = new MerkleTree(whitelistLeaves, keccak256, {
            sortPairs: true,
        });

        let whitelistRoot = whitelistTree.getRoot();

        const ArchOfPeaceWhitelist = await ethers.getContractFactory(
            'ArchOfPeaceWhitelist'
        );
        archOfPeaceWl = await ArchOfPeaceWhitelist.deploy();

        await archOfPeaceWl.deployed();

        archOfPeaceWl.setWhitelistRoot(whitelistRoot);

        const deployedRoot = (await archOfPeaceWl.whitelistRoot()).slice(2);
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

        const isWhitelisted = await archOfPeaceWl[
            'isAccountWhitelisted(address,uint256,bytes32,bytes32[])'
        ](
            whitelist[0].account.address,
            whitelist[0].limit,
            whitelist[0].chapter,
            hexProof
        );

        const hackerIsWhitelisted = await archOfPeaceWl[
            'isAccountWhitelisted(address,uint256,bytes32,bytes32[])'
        ](hacker.address, 1, chapter, hexProof);

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
            limit: 2,
            chapter: chapter,
        };
        whitelist.push(newWhitelistRecord);

        const newLeaf = toWhitelistLeaf(
            newWhitelistRecord.account.address,
            newWhitelistRecord.limit,
            newWhitelistRecord.chapter
        );

        const oldRoot = whitelistTree.getRoot();
        const oldOnchainRoot = (await archOfPeaceWl.whitelistRoot()).slice(2);

        whitelistTree.addLeaf(newLeaf);
        const newRoot = whitelistTree.getRoot();

        assert.notEqual(oldRoot, newRoot, 'Assert new root is different');
        assert.equal(
            oldRoot.toString('hex'),
            oldOnchainRoot,
            'Assert old onchain and offchain roots are the same'
        );

        await expect(
            archOfPeaceWl.connect(hacker).setWhitelistRoot(newRoot)
        ).to.be.revertedWith('Ownable: caller is not the owner');

        await (
            await archOfPeaceWl.connect(owner).setWhitelistRoot(newRoot)
        ).wait();

        const newOnchainRoot = (await archOfPeaceWl.whitelistRoot()).slice(2);

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

        const isWhitelisted = await archOfPeaceWl[
            'isAccountWhitelisted(address,uint256,bytes32,bytes32[])'
        ](
            whitelist[0].account.address,
            whitelist[0].limit,
            whitelist[0].chapter,
            hexProof
        );

        const hackerIsWhitelisted = await archOfPeaceWl[
            'isAccountWhitelisted(address,uint256,bytes32,bytes32[])'
        ](hacker.address, 1, chapter, hexProof);

        expect(isWhitelisted).to.equal(true);
        expect(hackerIsWhitelisted).to.equal(false);
    });

    it("COULD NOT allow any Non-owner to check someone else's whitelist status", async () => {
        const victim = whitelist[0];
        const whitelistedHacker = whitelist[1];

        const victimHexProof = whitelistTree.getHexProof(
            whitelistTree.getLeaves()[0]
        );

        await expect(
            archOfPeaceWl
                .connect(hacker)
                ['isAccountWhitelisted(address,uint256,bytes32,bytes32[])'](
                    victim.account.address,
                    victim.limit,
                    victim.chapter,
                    victimHexProof
                )
        ).to.be.revertedWith('ArchOfPeaceWhitelist: account check forbidden');

        await expect(
            archOfPeaceWl
                .connect(whitelistedHacker.account)
                ['isAccountWhitelisted(address,uint256,bytes32,bytes32[])'](
                    victim.account.address,
                    victim.limit,
                    victim.chapter,
                    victimHexProof
                )
        ).to.be.revertedWith('ArchOfPeaceWhitelist: account check forbidden');

        expect(
            await archOfPeaceWl
                .connect(victim.account)
                ['isAccountWhitelisted(address,uint256,bytes32,bytes32[])'](
                    victim.account.address,
                    victim.limit,
                    victim.chapter,
                    victimHexProof
                )
        ).to.equal(true);

        expect(
            await archOfPeaceWl
                .connect(hacker)
                ['isAccountWhitelisted(address,uint256,bytes32,bytes32[])'](
                    hacker.address,
                    victim.limit,
                    victim.chapter,
                    victimHexProof
                )
        ).to.equal(false);
    });

    it('SHOULD *only* allow Non-monuverse AND whitelisted users to mint');

    it('SHOULD *only* allow minting for sender account');

    it('SHOULD NOT allow monuverse to whitelist itself');
});
