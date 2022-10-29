import { expect } from 'chai';

import { ethers } from 'hardhat';
import { BigNumber, Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { MerkleTree } from 'merkletreejs';
import { keccak256 } from 'ethers/lib/utils';

import { toWhitelistLeaf, buffHashStr, hashStr } from '../common';

import {
    Chapter,
    Transition,
    WhitelistRecord,
    MintGroupRules,
    MAX_MINTABLE,
    MAX_SUPPLY,
    episode,
    branching,
} from '../episode';

import { writeEpisode } from './common';

type MintStatus = {
    balance: number;
    price: BigNumber;
};

type PublicMinter = {
    account: SignerWithAddress;
    status: MintStatus;
};

type WhitelistedMinter = {
    record: WhitelistRecord;
    proof: string[];
    status: MintStatus;
};

const mintChapterProportions: Array<number> = [0, 100, 400, 700, 1001];

const paths: Array<Array<Transition>> = [
    [branching[0], branching[1], branching[3], branching[8], branching[9]],
    [
        branching[0],
        branching[1],
        branching[2],
        branching[5],
        branching[8],
        branching[9],
    ],
    [
        branching[0],
        branching[1],
        branching[2],
        branching[4],
        branching[7],
        branching[8],
        branching[9],
    ],
    [
        branching[0],
        branching[1],
        branching[2],
        branching[4],
        branching[6],
        branching[8],
        branching[9],
    ],
];

const mintChapters: Array<Chapter> = episode.filter(
    (chapter: Chapter) => chapter.minting.limit > 0 && !chapter.minting.isOpen
);

describe('CONTRACT ArchOfPeace', () => {
    paths.forEach((path, pathIndex) => {
        let monuverse: SignerWithAddress;
        let hacker: SignerWithAddress;
        let users: SignerWithAddress[] = [];
        let whitelist: WhitelistRecord[] = []; // subset of users
        let publicMinters: SignerWithAddress[] = []; // equals users - whitelist

        let remainingWhitelist: WhitelistRecord[] = []; // modifiable during tests
        let whitelistTree: MerkleTree;
        let whitelistRoot: Buffer;

        // Arch Of Peace
        const name: string = 'Monutest';
        const symbol: string = 'MNT';
        const veilURI: string = 'test:veilURI_unique';
        const baseURI: string = 'test:baseURI_';
        const maxSupply: number = MAX_SUPPLY;
        let archOfPeace: Contract;

        // Chainlink VRF V2
        const vrfSubscriptionId: number = 1;
        const vrfGaslane: Buffer = Buffer.from(
            'd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
            'hex'
        );
        let vrfCoordinatorV2Mock: Contract;

        const getWhitelistedMinter = (label: string): WhitelistRecord => {
            const isRightMinter = (record: WhitelistRecord) =>
                record.chapter.equals(buffHashStr(label));

            const minterIndex: number = remainingWhitelist.findIndex((record) =>
                isRightMinter(record)
            );

            expect(minterIndex).to.be.greaterThan(-1);

            const minter = remainingWhitelist[minterIndex];

            remainingWhitelist.splice(minterIndex, 1);

            return minter;
        };

        const getProof = (address: string): string[] => {
            const isRightLeaf = (record: WhitelistRecord) =>
                record.account.address == address;

            const leafIndex: number = whitelist.findIndex((record) =>
                isRightLeaf(record)
            );

            expect(leafIndex).to.be.greaterThan(-1);

            return whitelistTree.getHexProof(
                whitelistTree.getLeaves()[leafIndex]
            );
        };

        before(async () => {
            [monuverse, hacker, ...users] = await ethers.getSigners();

            for (
                let i: number = 1;
                i < mintChapterProportions.length - 1;
                i++
            ) {
                whitelist = whitelist.concat(
                    users
                        .slice(
                            mintChapterProportions[i - 1],
                            mintChapterProportions[i]
                        )
                        .map((user) => ({
                            account: user,
                            limit: MAX_MINTABLE,
                            chapter: buffHashStr(episode[i].label),
                        }))
                );
            }
            remainingWhitelist = [...whitelist];

            publicMinters = users.slice(
                mintChapterProportions[mintChapterProportions.length - 2],
                mintChapterProportions[mintChapterProportions.length - 1]
            );

            let whitelistLeaves = whitelist.map((user) =>
                toWhitelistLeaf(user.account.address, user.limit, user.chapter)
            );

            whitelistTree = new MerkleTree(whitelistLeaves, keccak256, {
                sortPairs: true,
            });

            whitelistRoot = whitelistTree.getRoot();

            const VRFCoordinatorV2Mock = await ethers.getContractFactory(
                'VRFCoordinatorV2Mock'
            );
            vrfCoordinatorV2Mock = await VRFCoordinatorV2Mock.deploy(0, 0);
            await vrfCoordinatorV2Mock.deployed();
            await vrfCoordinatorV2Mock.createSubscription();
            await vrfCoordinatorV2Mock.fundSubscription(
                vrfSubscriptionId,
                ethers.utils.parseEther('5')
            );

            const ArchOfPeace = await ethers.getContractFactory('ArchOfPeace');
            archOfPeace = await ArchOfPeace.deploy(
                maxSupply,
                name,
                symbol,
                veilURI,
                baseURI,
                episode[0].label,
                vrfCoordinatorV2Mock.address,
                vrfGaslane,
                vrfSubscriptionId
            );
            await archOfPeace.deployed();

            vrfCoordinatorV2Mock.addConsumer(
                vrfSubscriptionId,
                archOfPeace.address
            );

            await writeEpisode(archOfPeace, episode, branching);

            await (await archOfPeace.setWhitelistRoot(whitelistRoot)).wait();

            expect((await archOfPeace.whitelistRoot()).slice(2)).to.equal(
                whitelistRoot.toString('hex')
            );
        });

        context(`\nEpisode Path #${pathIndex + 1}`, () => {
            path.forEach((transition) => {
                const chapter: Chapter =
                    episode[
                        episode.findIndex(
                            (chapter) => chapter.label == transition.from
                        )
                    ];

                context(`Chapter "${chapter.label}"`, () => {
                    let wlNativeMinter: WhitelistedMinter;
                    let wlRegulatedMinters: WhitelistedMinter[] = [];
                    let wlEnabledMinters: WhitelistedMinter[] = [];
                    let wlDisabledMinters: WhitelistedMinter[] = [];
                    let publicMinter: PublicMinter;

                    const getMinterSamples = async () => {
                        for (let i: number = 0; i < mintChapters.length; i++) {
                            const mintChapter = mintChapters[i];

                            const wlMinter: WhitelistRecord =
                                getWhitelistedMinter(mintChapter.label);

                            expect(wlMinter).to.not.be.undefined;

                            const proof: string[] = getProof(
                                wlMinter.account.address
                            );

                            const balance: number = await archOfPeace.balanceOf(
                                wlMinter.account.address
                            );

                            const price: BigNumber =
                                await archOfPeace.currentGroupPrice(
                                    mintChapter.label
                                );

                            const isNativeMinter: boolean =
                                mintChapter.label == chapter.label;

                            const rule: MintGroupRules | undefined =
                                chapter.minting.rules.find(
                                    (rule) => rule.label == mintChapter.label
                                );

                            if (isNativeMinter) {
                                wlNativeMinter = {
                                    record: wlMinter,
                                    proof: proof,
                                    status: {
                                        balance: balance,
                                        price: price,
                                    },
                                };
                            } else if (!isNativeMinter && rule != undefined) {
                                wlRegulatedMinters = [];
                                wlRegulatedMinters.push({
                                    record: wlMinter,
                                    proof: proof,
                                    status: {
                                        balance: balance,
                                        price: price,
                                    },
                                });
                            } else if (!isNativeMinter && rule == undefined) {
                                wlDisabledMinters = [];
                                wlDisabledMinters.push({
                                    record: wlMinter,
                                    proof: proof,
                                    status: {
                                        balance: balance,
                                        price: price,
                                    },
                                });
                            }

                            expect(
                                await archOfPeace.balanceOf(
                                    wlMinter.account.address
                                )
                            ).to.equal(0);
                        }

                        wlEnabledMinters = wlRegulatedMinters.concat([
                            wlNativeMinter,
                        ]);

                        await getPublicMinterSample();
                    };

                    const getPublicMinterSample = async () => {
                        const publicMinterAccount:
                            | SignerWithAddress
                            | undefined = publicMinters.pop();

                        expect(publicMinterAccount).to.not.be.undefined;

                        if (publicMinterAccount != undefined) {
                            const publicMinterBalance: number =
                                await archOfPeace.balanceOf(
                                    publicMinterAccount.address
                                );

                            const publicPrice: BigNumber =
                                await archOfPeace.currentDefaultPrice();

                            publicMinter = {
                                account: publicMinterAccount,
                                status: {
                                    balance: publicMinterBalance,
                                    price: publicPrice,
                                },
                            };
                        }
                    };

                    beforeEach(async () => {
                        if (chapter.minting.limit > 0) {
                            await getMinterSamples();
                        }
                    });

                    it(`MUST actually be in Chapter "${chapter.label}"`, async () => {
                        expect(await archOfPeace.currentChapter()).to.equal(
                            hashStr(chapter.label)
                        );
                    });

                    chapter.whitelisting
                        ? it('MUST allow whitelisting', async () => {
                              // TODO: check if whitelistRoot != 0 when transitioning
                              await (
                                  await archOfPeace.setWhitelistRoot(
                                      whitelistRoot
                                  )
                              ).wait();
                          })
                        : it('MUST NOT allow whitelisting', async () =>
                              await expect(
                                  archOfPeace.setWhitelistRoot(whitelistRoot)
                              ).to.be.revertedWith(
                                  'MonuverseEpisode: whitelisting not allowed'
                              ));

                    // TODO: regroup tests better and more efficiently
                    if (chapter.minting.limit > 0) {
                        it('MUST NOT allow any minting with insufficient offer for any minter type', async () => {
                            for (
                                let i: number = 0;
                                i < mintChapters.length;
                                i++
                            ) {
                                // equal to chapter.label && in rules && price > 0
                                const rule: MintGroupRules | undefined =
                                    chapter.minting.rules.find(
                                        (rule) =>
                                            rule.label == mintChapters[i].label
                                    );

                                const groupPrice: BigNumber =
                                    await archOfPeace.currentGroupPrice(
                                        mintChapters[i].label
                                    );

                                if (
                                    (rule != undefined ||
                                        mintChapters[i].label ==
                                            chapter.label) &&
                                    !groupPrice.isZero()
                                ) {
                                    const minter = getWhitelistedMinter(
                                        mintChapters[i].label
                                    );
                                    const proof = getProof(
                                        minter.account.address
                                    );

                                    let offer: BigNumber = BigNumber.from(
                                        minter.limit
                                    ).mul(groupPrice);

                                    await expect(
                                        archOfPeace
                                            .connect(minter.account)
                                            [
                                                'mint(uint256,uint256,bytes32,bytes32[])'
                                            ](
                                                minter.limit,
                                                MAX_MINTABLE,
                                                minter.chapter,
                                                proof,
                                                {
                                                    value: offer.sub(
                                                        BigNumber.from('1')
                                                    ),
                                                }
                                            )
                                    ).to.be.revertedWith(
                                        'ArchOfPeace: offer unmatched'
                                    );
                                }
                            }

                            expect(publicMinters.length).to.be.greaterThan(0);

                            const minter: SignerWithAddress | undefined =
                                publicMinters.pop();

                            if (minter != undefined && chapter.minting.isOpen) {
                                const groupPrice: BigNumber =
                                    await archOfPeace.currentDefaultPrice();
                                const offer: BigNumber =
                                    BigNumber.from(MAX_MINTABLE).mul(
                                        groupPrice
                                    );

                                await expect(
                                    archOfPeace
                                        .connect(minter)
                                        ['mint(uint256)'](MAX_MINTABLE, {
                                            value: offer.sub(
                                                BigNumber.from('1')
                                            ),
                                        })
                                ).to.be.revertedWith(
                                    'ArchOfPeace: offer unmatched'
                                );
                            }
                        });

                        if (chapter.minting.isOpen) {
                            mintChapters.forEach(async (mintChapter) => {
                                it(`MUST allow open mint OR restricted fixed price mint to "${mintChapter.label}"`, async () => {
                                    const minter: WhitelistRecord =
                                        getWhitelistedMinter(mintChapter.label);

                                    const [groupEnabled, fixedPriceGroup] =
                                        await archOfPeace.groupRule(
                                            chapter.label,
                                            mintChapter.label
                                        );

                                    const balance: number =
                                        await archOfPeace.balanceOf(
                                            minter.account.address
                                        );

                                    const offChainGroupPrice: BigNumber =
                                        ethers.utils.parseEther(
                                            groupEnabled
                                                ? mintChapter.minting.price.toString()
                                                : chapter.minting.price.toString()
                                        );

                                    const groupPrice: BigNumber =
                                        await archOfPeace.currentGroupPrice(
                                            mintChapter.label
                                        );
                                    expect(groupPrice).to.equal(
                                        offChainGroupPrice
                                    );

                                    const offer: BigNumber = BigNumber.from(
                                        minter.limit
                                    ).mul(groupPrice);
                                    const offerIsRight: boolean =
                                        await archOfPeace.offerMatchesGroupPrice(
                                            mintChapter.label,
                                            minter.limit,
                                            offer
                                        );
                                    expect(offerIsRight).to.be.true;

                                    if (groupEnabled) {
                                        expect(fixedPriceGroup).to.equal(true);

                                        const proof: string[] = getProof(
                                            minter.account.address
                                        );

                                        await (
                                            await archOfPeace
                                                .connect(minter.account)
                                                [
                                                    'mint(uint256,uint256,bytes32,bytes32[])'
                                                ](
                                                    minter.limit,
                                                    minter.limit,
                                                    minter.chapter,
                                                    proof,
                                                    {
                                                        value: offer,
                                                    }
                                                )
                                        ).wait();
                                    } else {
                                        await (
                                            await archOfPeace
                                                .connect(minter.account)
                                                ['mint(uint256)'](
                                                    minter.limit,
                                                    { value: offer }
                                                )
                                        ).wait();
                                    }

                                    expect(
                                        await archOfPeace.balanceOf(
                                            minter.account.address
                                        )
                                    ).to.equal(balance + minter.limit);
                                });
                            });

                            it('MUST allow non-whitelisted minters to mint at public price', async () => {
                                expect(publicMinters.length).to.be.greaterThan(
                                    0
                                );

                                const minter: SignerWithAddress | undefined =
                                    publicMinters.pop();

                                if (minter != undefined) {
                                    const balance: number =
                                        await archOfPeace.balanceOf(
                                            minter.address
                                        );

                                    const groupPrice: BigNumber =
                                        await archOfPeace.currentDefaultPrice();
                                    expect(groupPrice).to.equal(
                                        ethers.utils.parseEther(
                                            chapter.minting.price.toString()
                                        )
                                    );

                                    const offer: BigNumber =
                                        BigNumber.from(MAX_MINTABLE).mul(
                                            groupPrice
                                        );
                                    const offerIsRight: boolean =
                                        await archOfPeace.offerMatchesGroupPrice(
                                            chapter.label,
                                            MAX_MINTABLE,
                                            offer
                                        );
                                    expect(offerIsRight).to.be.true;

                                    await (
                                        await archOfPeace
                                            .connect(minter)
                                            ['mint(uint256)'](MAX_MINTABLE, {
                                                value: offer,
                                            })
                                    ).wait();

                                    expect(
                                        await archOfPeace.balanceOf(
                                            minter.address
                                        )
                                    ).to.equal(balance + MAX_MINTABLE);
                                }
                            });

                            it('MUST allow multiple minting transactions for each allowed minter until personal limit reached', async () => {
                                expect(MAX_MINTABLE).to.be.greaterThan(0);

                                for (let i: number = 0; i < MAX_MINTABLE; i++) {
                                    await (
                                        await archOfPeace
                                            .connect(publicMinter.account)
                                            ['mint(uint256)'](1, {
                                                value: publicMinter.status
                                                    .price,
                                            })
                                    ).wait();

                                    publicMinter.status.balance++;

                                    expect(
                                        await archOfPeace.balanceOf(
                                            publicMinter.account.address
                                        )
                                    ).to.equal(publicMinter.status.balance);
                                }

                                await expect(
                                    archOfPeace
                                        .connect(publicMinter.account)
                                        ['mint(uint256)'](1, {
                                            value: publicMinter.status.price,
                                        })
                                ).to.be.revertedWith(
                                    'ArchOfPeace: quantity not allowed'
                                );
                            });

                            it('MUST NOT allow any minting with exceeding quantity', async () => {
                                const exceedingLimit = MAX_MINTABLE + 1;

                                const offer: BigNumber = BigNumber.from(
                                    exceedingLimit
                                ).mul(publicMinter.status.price);

                                await expect(
                                    archOfPeace
                                        .connect(publicMinter.account)
                                        ['mint(uint256)'](exceedingLimit, {
                                            value: offer,
                                        })
                                ).to.be.revertedWith(
                                    'ArchOfPeace: quantity not allowed'
                                );
                            });
                        } else {
                            it(`MUST allow minting to whitelisted "${chapter.label}" native minters`, async () => {
                                const minter: WhitelistRecord =
                                    getWhitelistedMinter(chapter.label);

                                const proof: string[] = getProof(
                                    minter.account.address
                                );

                                const balance: number =
                                    await archOfPeace.balanceOf(
                                        minter.account.address
                                    );

                                const groupPrice: BigNumber =
                                    await archOfPeace.currentDefaultPrice();

                                const offer: BigNumber = BigNumber.from(
                                    minter.limit
                                ).mul(groupPrice);

                                const offerIsRight: boolean =
                                    await archOfPeace.offerMatchesGroupPrice(
                                        chapter.label,
                                        MAX_MINTABLE,
                                        offer
                                    );

                                expect(offerIsRight).to.be.true;

                                await (
                                    await archOfPeace
                                        .connect(minter.account)
                                        [
                                            'mint(uint256,uint256,bytes32,bytes32[])'
                                        ](
                                            MAX_MINTABLE,
                                            minter.limit,
                                            minter.chapter,
                                            proof,
                                            { value: offer }
                                        )
                                ).wait();

                                expect(
                                    await archOfPeace.balanceOf(
                                        minter.account.address
                                    )
                                ).to.equal(balance + MAX_MINTABLE);
                            });

                            it('MUST NOT allow non-whitelisted minters to mint', async () => {
                                expect(publicMinters.length).to.be.greaterThan(
                                    0
                                );

                                const minter: SignerWithAddress | undefined =
                                    publicMinters.pop();

                                if (minter != undefined) {
                                    const groupPrice: BigNumber =
                                        await archOfPeace.currentDefaultPrice();
                                    expect(groupPrice).to.equal(
                                        ethers.utils.parseEther(
                                            chapter.minting.price.toString()
                                        )
                                    );

                                    const offer: BigNumber =
                                        BigNumber.from(MAX_MINTABLE).mul(
                                            groupPrice
                                        );
                                    const offerIsRight: boolean =
                                        await archOfPeace.offerMatchesGroupPrice(
                                            chapter.label,
                                            MAX_MINTABLE,
                                            offer
                                        );
                                    expect(offerIsRight).to.be.true;

                                    await expect(
                                        archOfPeace
                                            .connect(minter)
                                            ['mint(uint256)'](MAX_MINTABLE, {
                                                value: offer,
                                            })
                                    ).to.be.revertedWith(
                                        'ArchOfPeace: sender not whitelisted'
                                    );
                                }
                            });

                            it(`MUST allow multiple minting transactions for each minter type until personal limit reached`, async () => {
                                for (
                                    let i: number = 0;
                                    i < wlEnabledMinters.length;
                                    i++
                                ) {
                                    let minter = wlEnabledMinters[i];

                                    expect(
                                        minter.record.limit
                                    ).to.be.greaterThan(0);

                                    for (
                                        let j: number = 0;
                                        j < minter.record.limit;
                                        j++
                                    ) {
                                        await (
                                            await archOfPeace
                                                .connect(minter.record.account)
                                                [
                                                    'mint(uint256,uint256,bytes32,bytes32[])'
                                                ](
                                                    1,
                                                    minter.record.limit,
                                                    minter.record.chapter,
                                                    minter.proof,
                                                    {
                                                        value: minter.status
                                                            .price,
                                                    }
                                                )
                                        ).wait();

                                        minter.status.balance++;

                                        expect(
                                            await archOfPeace.balanceOf(
                                                minter.record.account.address
                                            )
                                        ).to.equal(minter.status.balance);
                                    }

                                    await expect(
                                        archOfPeace
                                            .connect(minter.record.account)
                                            [
                                                'mint(uint256,uint256,bytes32,bytes32[])'
                                            ](
                                                1,
                                                minter.record.limit,
                                                minter.record.chapter,
                                                minter.proof,
                                                { value: minter.status.price }
                                            )
                                    ).to.be.revertedWith(
                                        'ArchOfPeace: quantity not allowed'
                                    );
                                }
                            });

                            it('MUST NOT allow any minting with exceeding quantity', async () => {
                                for (
                                    let i: number = 0;
                                    i < wlEnabledMinters.length;
                                    i++
                                ) {
                                    const exceedingLimit: number =
                                        wlEnabledMinters[i].record.limit + 1;

                                    const offer: BigNumber = BigNumber.from(
                                        exceedingLimit
                                    ).mul(wlEnabledMinters[i].status.price);

                                    await expect(
                                        archOfPeace
                                            .connect(
                                                wlEnabledMinters[i].record
                                                    .account
                                            )
                                            [
                                                'mint(uint256,uint256,bytes32,bytes32[])'
                                            ](
                                                exceedingLimit,
                                                MAX_MINTABLE,
                                                wlEnabledMinters[i].record
                                                    .chapter,
                                                wlEnabledMinters[i].proof,
                                                {
                                                    value: offer,
                                                }
                                            )
                                    ).to.be.revertedWith(
                                        'ArchOfPeace: quantity not allowed'
                                    );
                                }
                            });

                            it('MUST NOT allow minting groups outside Chapter Rules and Chapter Natives', async () => {
                                for (
                                    let i: number = 0;
                                    i < mintChapters.length;
                                    i++
                                ) {
                                    const rule: MintGroupRules | undefined =
                                        chapter.minting.rules.find(
                                            (rule) =>
                                                rule.label ==
                                                mintChapters[i].label
                                        );

                                    const alienMinter: boolean =
                                        mintChapters[i].label != chapter.label;

                                    if (rule == undefined && alienMinter) {
                                        const minter: WhitelistRecord =
                                            getWhitelistedMinter(
                                                mintChapters[i].label
                                            );

                                        const proof: string[] = getProof(
                                            minter.account.address
                                        );

                                        const groupPrice: BigNumber =
                                            await archOfPeace.currentDefaultPrice();

                                        const offer: BigNumber = BigNumber.from(
                                            minter.limit
                                        ).mul(groupPrice);

                                        const offerIsRight: boolean =
                                            await archOfPeace.offerMatchesGroupPrice(
                                                mintChapters[i],
                                                MAX_MINTABLE,
                                                offer
                                            );

                                        expect(offerIsRight).to.be.true;

                                        await expect(
                                            archOfPeace
                                                .connect(minter.account)
                                                [
                                                    'mint(uint256,uint256,bytes32,bytes32[])'
                                                ](
                                                    MAX_MINTABLE,
                                                    minter.limit,
                                                    minter.chapter,
                                                    proof,
                                                    { value: offer }
                                                )
                                        ).to.be.revertedWith(
                                            'ArchOfPeace: group not allowed'
                                        );
                                    }
                                }
                            });
                        }

                        chapter.minting.rules.forEach((rule) =>
                            it(`MUST allow restricted minting to whitelisted "${rule.label}" minters`, async () => {
                                const minter: WhitelistRecord =
                                    getWhitelistedMinter(rule.label);

                                const hexProof = getProof(
                                    minter.account.address
                                );

                                const balance: number =
                                    await archOfPeace.balanceOf(
                                        minter.account.address
                                    );

                                await (
                                    await archOfPeace
                                        .connect(minter.account)
                                        [
                                            'mint(uint256,uint256,bytes32,bytes32[])'
                                        ](
                                            minter.limit - balance,
                                            minter.limit,
                                            minter.chapter,
                                            hexProof,
                                            {
                                                value: ethers.utils.parseEther(
                                                    '2'
                                                ),
                                            }
                                        )
                                ).wait();

                                expect(
                                    await archOfPeace.balanceOf(
                                        minter.account.address
                                    )
                                ).to.equal(balance + minter.limit);
                            })
                        );

                        it('MUST only show veil for every single minted token', async () => {
                            const totalSupply: number =
                                await archOfPeace.totalSupply();

                            for (let i: number = 0; i < totalSupply; i++) {
                                expect(await archOfPeace.tokenURI(i)).to.equal(
                                    veilURI
                                );
                            }
                        });
                    } else {
                        it('MUST NOT allow any type of minting at all', async () => {
                            for (
                                let i: number = 0;
                                i < mintChapters.length;
                                i++
                            ) {
                                const minter: WhitelistRecord =
                                    getWhitelistedMinter(mintChapters[i].label);

                                const proof = getProof(minter.account.address);
                                const groupPrice: BigNumber =
                                    await archOfPeace.currentGroupPrice(
                                        mintChapters[i].label
                                    );
                                const offer: BigNumber = BigNumber.from(
                                    minter.limit
                                ).mul(groupPrice);

                                await expect(
                                    archOfPeace
                                        .connect(minter.account)
                                        [
                                            'mint(uint256,uint256,bytes32,bytes32[])'
                                        ](
                                            MAX_MINTABLE,
                                            minter.limit,
                                            minter.chapter,
                                            proof,
                                            {
                                                value: offer,
                                            }
                                        )
                                ).to.be.revertedWith(
                                    'ArchOfPeace: no mint chapter'
                                );
                            }

                            expect(publicMinters.length).to.be.greaterThan(0);

                            const minter: SignerWithAddress | undefined =
                                publicMinters.pop();

                            if (minter != undefined && chapter.minting.isOpen) {
                                const groupPrice: BigNumber =
                                    await archOfPeace.currentDefaultPrice();
                                const offer: BigNumber =
                                    BigNumber.from(MAX_MINTABLE).mul(
                                        groupPrice
                                    );

                                await expect(
                                    archOfPeace
                                        .connect(minter)
                                        ['mint(uint256)'](MAX_MINTABLE, {
                                            value: offer,
                                        })
                                ).to.be.revertedWith(
                                    'ArchOfPeace: no mint chapter'
                                );
                            }
                        });
                    }

                    if (chapter.revealing) {
                        it('MUST allow requesting reveal seed', async () => {
                            const requestId: BigNumber = BigNumber.from(1);

                            await expect(archOfPeace.reveal())
                                .to.emit(archOfPeace, 'RandomnessRequested')
                                .withArgs(requestId)
                                .and.to.emit(
                                    vrfCoordinatorV2Mock,
                                    'RandomWordsRequested'
                                );
                        });

                        it('MUST NOT allow another reveal request if seed is fulfilling', async () => {
                            await expect(
                                archOfPeace.reveal()
                            ).to.be.revertedWith(
                                'ArchOfPeace: currently fulfilling'
                            );
                        });

                        it('MUST receive random seed successfully', async () => {
                            const requestId: BigNumber = BigNumber.from(1);

                            await expect(
                                vrfCoordinatorV2Mock.fulfillRandomWords(
                                    requestId,
                                    archOfPeace.address
                                )
                            )
                                .to.emit(
                                    vrfCoordinatorV2Mock,
                                    'RandomWordsFulfilled'
                                )
                                .and.to.emit(archOfPeace, 'EpisodeRevealed')
                                .withArgs(
                                    buffHashStr(transition.from),
                                    buffHashStr(transition.to)
                                );
                        });

                        it('MUST show each token as revealed Arch of Peace', async () => {
                            const totalSupply: number =
                                await archOfPeace.totalSupply();

                            let mappedMetadataIds: Set<number> =
                                new Set<number>();

                            for (let i: number = 0; i < totalSupply; i++) {
                                const tokenURI: string =
                                    await archOfPeace.tokenURI(i);

                                expect(tokenURI.startsWith(baseURI)).to.be.true;
                                expect(tokenURI.length).to.be.greaterThan(
                                    baseURI.length
                                );

                                const mappedMetadataId: number = Number(
                                    tokenURI.slice(baseURI.length)
                                );

                                expect(mappedMetadataId).to.not.be.NaN;
                                expect(mappedMetadataId).to.not.be.undefined;
                                expect(mappedMetadataIds.has(mappedMetadataId))
                                    .to.be.false;

                                mappedMetadataIds.add(mappedMetadataId);
                            }

                            expect(Math.min(...mappedMetadataIds)).to.equal(0);
                            expect(Math.max(...mappedMetadataIds)).to.equal(
                                totalSupply - 1
                            );
                        });

                        // TODO (optional): somehow stop transitioning and then uncomment
                        // it('MUST NOT allow another reveal request if seed is fulfilled', async () => {
                        //     await expect(
                        //         archOfPeace.reveal()
                        //     ).to.be.revertedWith(
                        //         'ArchOfPeace: already revealed'
                        //     );
                        // });
                    } else {
                        it('MUST NOT allow reveal', async () => {
                            await expect(
                                archOfPeace.reveal()
                            ).to.be.revertedWith(
                                'MonuverseEpisode: reveal not allowed'
                            );
                        });
                    }

                    it(`MUST perform the "${transition.event}" transition`, async () => {
                        if (
                            transition.event == 'EpisodeMinted' ||
                            transition.event == 'ChapterMinted'
                        ) {
                            if (chapter.minting.limit == MAX_SUPPLY) {
                                process.stdout.write(
                                    '\t! chapter mint limit coincides with collection max supply\n'
                                );
                            }

                            process.stdout.write(
                                '\t> users are minting remaining chapter allocation'
                            );

                            if (!chapter.minting.isOpen) {
                                let supply: number = (
                                    await archOfPeace.totalSupply()
                                ).toNumber();

                                expect(supply).to.be.below(
                                    chapter.minting.limit
                                );

                                while (supply < chapter.minting.limit) {
                                    process.stdout.write('.');
                                    await getMinterSamples();

                                    for (
                                        let i: number = 0;
                                        i < wlEnabledMinters.length;
                                        i++
                                    ) {
                                        const minter: WhitelistedMinter =
                                            wlEnabledMinters[i];

                                        expect(
                                            await archOfPeace.balanceOf(
                                                minter.record.account.address
                                            )
                                        ).to.equal(0);

                                        let quantity: number =
                                            minter.record.limit;

                                        const futureSupply: number =
                                            supply + quantity;

                                        const offer: BigNumber = BigNumber.from(
                                            quantity
                                        ).mul(minter.status.price);

                                        if (
                                            futureSupply < chapter.minting.limit
                                        ) {
                                            await (
                                                await archOfPeace
                                                    .connect(
                                                        minter.record.account
                                                    )
                                                    [
                                                        'mint(uint256,uint256,bytes32,bytes32[])'
                                                    ](
                                                        quantity,
                                                        minter.record.limit,
                                                        minter.record.chapter,
                                                        minter.proof,
                                                        { value: offer }
                                                    )
                                            ).wait();

                                            expect(
                                                await archOfPeace.totalSupply()
                                            ).to.equal(futureSupply);
                                        } else {
                                            quantity =
                                                quantity -
                                                (futureSupply -
                                                    chapter.minting.limit);

                                            await expect(
                                                archOfPeace
                                                    .connect(
                                                        minter.record.account
                                                    )
                                                    [
                                                        'mint(uint256,uint256,bytes32,bytes32[])'
                                                    ](
                                                        quantity,
                                                        minter.record.limit,
                                                        minter.record.chapter,
                                                        minter.proof,
                                                        { value: offer }
                                                    )
                                            )
                                                .to.emit(
                                                    archOfPeace,
                                                    transition.event
                                                )
                                                .withArgs(
                                                    buffHashStr(
                                                        transition.from
                                                    ),
                                                    buffHashStr(transition.to)
                                                );
                                        }

                                        supply = (
                                            await archOfPeace.totalSupply()
                                        ).toNumber();

                                        if (supply >= chapter.minting.limit) {
                                            break;
                                        }
                                    }
                                }
                            } else {
                                let supply: number = (
                                    await archOfPeace.totalSupply()
                                ).toNumber();

                                expect(supply).to.be.below(
                                    chapter.minting.limit
                                );

                                while (supply < chapter.minting.limit) {
                                    process.stdout.write('.');
                                    await getPublicMinterSample();

                                    expect(
                                        await archOfPeace.balanceOf(
                                            publicMinter.account.address
                                        )
                                    ).to.equal(0);

                                    const futureSupply: number =
                                        supply + MAX_MINTABLE;

                                    const offer: BigNumber = BigNumber.from(
                                        MAX_MINTABLE
                                    ).mul(publicMinter.status.price);

                                    if (futureSupply < chapter.minting.limit) {
                                        await (
                                            await archOfPeace
                                                .connect(publicMinter.account)
                                                ['mint(uint256)'](
                                                    MAX_MINTABLE,
                                                    { value: offer }
                                                )
                                        ).wait();

                                        expect(
                                            await archOfPeace.totalSupply()
                                        ).to.equal(futureSupply);
                                    } else {
                                        let quantity: number =
                                            MAX_MINTABLE -
                                            (futureSupply -
                                                chapter.minting.limit);

                                        await expect(
                                            archOfPeace
                                                .connect(publicMinter.account)
                                                ['mint(uint256)'](quantity, {
                                                    value: offer,
                                                })
                                        )
                                            .to.emit(
                                                archOfPeace,
                                                transition.event
                                            )
                                            .withArgs(
                                                buffHashStr(transition.from),
                                                buffHashStr(transition.to)
                                            );
                                    }

                                    supply = (
                                        await archOfPeace.totalSupply()
                                    ).toNumber();

                                    if (supply >= chapter.minting.limit) {
                                        break;
                                    }
                                }
                            }

                            process.stdout.write('\n');
                        } else if (transition.event == 'MintingSealed') {
                            process.stdout.write(
                                '\t! sold out can not be reached\n'
                            );

                            await expect(archOfPeace.sealMinting())
                                .to.emit(archOfPeace, 'MintingSealed')
                                .withArgs(
                                    buffHashStr(transition.from),
                                    buffHashStr(transition.to)
                                );
                        } else if (
                            transition.event == 'EpisodeProgressedOnlife'
                        ) {
                            await expect(archOfPeace.emitOnlifeEvent())
                                .to.emit(archOfPeace, 'EpisodeProgressedOnlife')
                                .withArgs(
                                    buffHashStr(transition.from),
                                    buffHashStr(transition.to)
                                );
                        }
                    });
                });
            });

            context(
                `Final Chapter "${episode[episode.length - 1].label}"`,
                () => {
                    it(`MUST actually be in Final Chapter`, async () => {
                        expect(await archOfPeace.isFinal()).to.be.true;
                    });
                }
            );
        });
    });

    it('MUST NOT allow another reveal');

    it('MUST allow token burn');
});
