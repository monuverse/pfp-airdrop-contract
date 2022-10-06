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
    limit: number;
    chapter: Buffer;
};

const toWhitelistLeaf = (
    address: string,
    limit: number,
    chapter: Buffer
): Buffer => {
    return Buffer.from(
        ethers.utils
            .solidityKeccak256(
                ['address', 'uint256', 'bytes32'],
                [address, limit, chapter]
            )
            .slice(2),
        'hex'
    );
};

const hashStr = (value: string) => {
    return Buffer.from(
        ethers.utils.solidityKeccak256(['string'], [value]).slice(2),
        'hex'
    );
};

describe('CONTRACT ArchOfPeaceWhitelist', () => {
    let monuverse: SignerWithAddress;
    let chad: whitelistRecord; // chad, always whitelisted
    let hacker: SignerWithAddress; // hacker, always out of the whitelist
    let users: SignerWithAddress[]; // users may enter/exit whitelist

    let whitelist: whitelistRecord[];
    let whitelistTree: MerkleTree;

    const preRevealUri = 'preRevealURI';
    let archOfLight: Contract;

    const chapter: Buffer = hashStr('builders');

    before(async () => {
        [monuverse, hacker, ...users] = await ethers.getSigners();

        whitelist = users
            .slice(0, 8)
            .map((user) => ({ account: user, limit: 2, chapter: chapter }));

        chad = whitelist[0];

        let whitelistLeaves = whitelist.map((user) =>
            toWhitelistLeaf(user.account.address, user.limit, user.chapter)
        );

        whitelistTree = new MerkleTree(whitelistLeaves, keccak256, {
            sortPairs: true,
        });

        let whitelistRoot = whitelistTree.getRoot();

        const ArchOfLight = await ethers.getContractFactory(
            'ArchOfPeaceWhitelist'
        );
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

        const isWhitelisted = await archOfLight[
            'isAccountWhitelisted(address,uint256,bytes32,bytes32[])'
        ](
            whitelist[0].account.address,
            whitelist[0].limit,
            whitelist[0].chapter,
            hexProof
        );

        const hackerIsWhitelisted = await archOfLight[
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

        const isWhitelisted = await archOfLight[
            'isAccountWhitelisted(address,uint256,bytes32,bytes32[])'
        ](
            whitelist[0].account.address,
            whitelist[0].limit,
            whitelist[0].chapter,
            hexProof
        );

        const hackerIsWhitelisted = await archOfLight[
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
            archOfLight
                .connect(hacker)
                ['isAccountWhitelisted(address,uint256,bytes32,bytes32[])'](
                    victim.account.address,
                    victim.limit,
                    victim.chapter,
                    victimHexProof
                )
        ).to.be.revertedWith('ArchOfPeaceWhitelist: account check forbidden');

        await expect(
            archOfLight
                .connect(whitelistedHacker.account)
                ['isAccountWhitelisted(address,uint256,bytes32,bytes32[])'](
                    victim.account.address,
                    victim.limit,
                    victim.chapter,
                    victimHexProof
                )
        ).to.be.revertedWith('ArchOfPeaceWhitelist: account check forbidden');

        expect(
            await archOfLight
                .connect(victim.account)
                ['isAccountWhitelisted(address,uint256,bytes32,bytes32[])'](
                    victim.account.address,
                    victim.limit,
                    victim.chapter,
                    victimHexProof
                )
        ).to.equal(true);

        expect(
            await archOfLight
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
