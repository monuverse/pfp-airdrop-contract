import { expect } from 'chai';

import { ethers } from 'hardhat';
import { BigNumber, Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { MerkleTree } from 'merkletreejs';
import { keccak256 } from 'ethers/lib/utils';

import {
    Chapter,
    Transition,
    whitelistRecord,
    toWhitelistLeaf,
    writeEpisode,
    buffHashStr,
    hashStr,
} from './common';

const episode: Array<Chapter> = [
    {
        label: 'Introduction: The Big Bang',
        whitelisting: true,
        minting: { limit: 0, price: 0, rules: [], isOpen: false },
        revealing: false,
    },
    {
        label: 'Chapter I: The Arch Builders',
        whitelisting: true,
        minting: { limit: 777, price: 0, rules: [], isOpen: false },
        revealing: false,
    },
    {
        label: 'Chapter II: The Chosen Ones',
        whitelisting: false,
        minting: {
            limit: 3777,
            price: 0.09,
            rules: [
                {
                    label: 'Chapter I: The Arch Builders',
                    enabled: true,
                    fixedPrice: true,
                },
            ],
            isOpen: false,
        },
        revealing: false,
    },
    {
        label: 'Chapter III: The Believers',
        whitelisting: false,
        minting: {
            limit: 7777,
            price: 0.11,
            rules: [
                {
                    label: 'Chapter I: The Arch Builders',
                    enabled: true,
                    fixedPrice: true,
                },
                {
                    label: 'Chapter II: The Chosen Ones',
                    enabled: true,
                    fixedPrice: false,
                },
            ],
            isOpen: false,
        },
        revealing: false,
    },
    {
        label: 'Chapter IV: The Brave',
        whitelisting: false,
        minting: {
            limit: 7777,
            price: 0.12,
            rules: [
                {
                    label: 'Chapter I: The Arch Builders',
                    enabled: true,
                    fixedPrice: true,
                },
            ],
            isOpen: false,
        },
        revealing: false,
    },
    {
        label: 'Chapter V: A Monumental Reveal',
        whitelisting: false,
        minting: { limit: 0, price: 0, rules: [], isOpen: false },
        revealing: true,
    },
    {
        label: 'Conclusion: Monuverse',
        whitelisting: false,
        minting: { limit: 0, price: 0, rules: [], isOpen: false },
        revealing: false,
    },
];

const mintChapterProportions: Array<number> = [2, 10, 40, 70, 101];

const branching: Array<Transition> = [
    {
        from: 'Introduction: The Big Bang',
        event: 'EpisodeProgressedOnlife',
        to: 'Chapter I: The Arch Builders',
    },
    {
        from: 'Chapter I: The Arch Builders',
        event: 'EpisodeProgressedOnlife',
        to: 'Chapter II: The Chosen Ones',
    },
    {
        from: 'Chapter II: The Chosen Ones',
        event: 'EpisodeProgressedOnlife',
        to: 'Chapter III: The Believers',
    },
    {
        from: 'Chapter II: The Chosen Ones',
        event: 'EpisodeMinted',
        to: 'Chapter V: A Monumental Reveal',
    },
    {
        from: 'Chapter III: The Believers',
        event: 'EpisodeProgressedOnlife',
        to: 'Chapter IV: The Brave',
    },
    {
        from: 'Chapter III: The Believers',
        event: 'EpisodeMinted',
        to: 'Chapter V: A Monumental Reveal',
    },
    {
        from: 'Chapter IV: The Brave',
        event: 'EpisodeProgressedOnlife',
        to: 'Chapter V: A Monumental Reveal',
    },
    {
        from: 'Chapter IV: The Brave',
        event: 'EpisodeMinted',
        to: 'Chapter V: A Monumental Reveal',
    },
    {
        from: 'Chapter V: A Monumental Reveal',
        event: 'EpisodeRevealed',
        to: 'Conclusion: Monuverse',
    },
];

const paths: Array<Array<Transition>> = [
    [branching[0], branching[1], branching[3], branching[8]],
    [branching[0], branching[1], branching[2], branching[5], branching[8]],
    [
        branching[0],
        branching[1],
        branching[2],
        branching[4],
        branching[7],
        branching[8],
    ],
    [
        branching[0],
        branching[1],
        branching[2],
        branching[4],
        branching[6],
        branching[8],
    ],
];

describe('CONTRACT ArchOfPeace', () => {
    paths.forEach((path, pathIndex) => {
        // Actors that will interact with Smartcontracts
        let monuverse: SignerWithAddress;
        let hacker: SignerWithAddress;
        let users: SignerWithAddress[] = [];

        let whitelist: whitelistRecord[] = [];
        let whitelistTree: MerkleTree;
        let whitelistRoot: Buffer;

        // Arch Of Peace
        const name: string = 'Monutest';
        const symbol: string = 'MNT';
        const veilURI: string = 'test:veilURI_unique';
        const baseURI: string = 'test:baseURI_';
        const maxSupply: number = 77;
        let archOfPeace: Contract;

        // Chainlink VRF V2
        const vrfSubscriptionId: number = 1;
        const vrfGaslane: Buffer = Buffer.from(
            'd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
            'hex'
        );
        let vrfCoordinatorV2Mock: Contract;

        before(async () => {
            [monuverse, hacker, ...users] = await ethers.getSigners();

            console.log(users.length);

            for (let i: number = 1; i < mintChapterProportions.length; i++) {
                whitelist = whitelist.concat(
                    users
                        .slice(
                            mintChapterProportions[i - 1],
                            mintChapterProportions[i]
                        )
                        .map((user) => ({
                            account: user,
                            limit: 3,
                            chapter: buffHashStr(episode[i].label),
                        }))
                );
            }

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
        });

        context(`\nEpisode Path #${pathIndex + 1}`, () => {
            path.forEach((transition, transitionIndex) => {
                const chapter: Chapter =
                    episode[
                        episode.findIndex(
                            (chapter) => chapter.label == transition.from
                        )
                    ];

                context(`Chapter "${chapter.label}"`, () => {
                    it('MUST be in the right chapter', async () => {
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

                    if (chapter.minting.limit > 0) {
                        chapter.minting.rules.forEach((rule) =>
                            it(`MUST allow minting to whitelisted ${rule.label} minters`, async () => {
                                const isRightMinter = (
                                    record: whitelistRecord
                                ) =>
                                    record.chapter.equals(
                                        buffHashStr(chapter.label)
                                    );

                                const minterIndex = whitelist.findIndex(
                                    (record) => isRightMinter(record)
                                );

                                const minter: whitelistRecord =
                                    whitelist[minterIndex];

                                const balance: number =
                                    await archOfPeace.balanceOf(
                                        minter.account.address
                                    );

                                const hexProof = whitelistTree.getHexProof(
                                    whitelistTree.getLeaves()[minterIndex]
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
                                            hexProof
                                        )
                                ).wait();

                                whitelist.splice(minterIndex, 1);

                                expect(await archOfPeace.balanceOf(
                                    minter.account.address
                                )).to.equal(balance + minter.limit);
                            })
                        );

                        it('MUST NOT allow minting', async () => {
                            //   const hexProof = whitelistTree.getHexProof(
                            //       whitelistTree.getLeaves()[0]
                            //   );
                            //   await expect(
                            //       archOfPeace.mint(3, 3)
                            //   ).to.be.revertedWith(
                            //       'ArchOfPeace: no mint chapter'
                            //   );
                        });
                    } else {
                    }

                    if (chapter.revealing) {
                        it('MUST allow requesting reveal seed');

                        it(
                            'MUST NOT allow another reveal request if seed is fulfilling'
                        );

                        it('MUST successfully reveal Episode tokens');

                        it(
                            'MUST NOT allow another reveal request if seed is fulfilled'
                        );
                    } else {
                        it('MUST NOT allow revealing', async () => {
                            await expect(
                                archOfPeace.reveal()
                            ).to.be.revertedWith(
                                'MonuverseEpisode: reveal not allowed'
                            );
                        });
                    }

                    it('MUST perform the right path transition', async () => {
                        if (transition.event == 'EpisodeMinted') {
                            await expect(archOfPeace.sealMinting()).to.emit(
                                archOfPeace,
                                'EpisodeMinted'
                            );
                        } else if (
                            transition.event == 'EpisodeProgressedOnlife'
                        ) {
                            await expect(archOfPeace.emitOnlifeEvent()).to.emit(
                                archOfPeace,
                                'EpisodeProgressedOnlife'
                            );
                        }
                    });
                });
            });
        });
    });

    it('MUST only allow transfers after Mint is done');

    it(
        'MUST allow all users to mint multiple tokens at once'
        // , async () => {
        //     const userAllocation = Math.floor(maxSupply / users.length);

        //     for (let i: number = 0; i < users.length; i++) {
        //         await (
        //             await archOfPeace
        //                 .connect(users[i])
        //                 ['mint(uint256,uint256,bytes32,bytes32[])'](4)
        //         ).wait();
        //         expect(await archOfPeace.balanceOf(users[i].address)).to.equal(
        //             userAllocation
        //         );
        //     }
        // }
    );

    // it('MUST only show unrevealed arch', async () => {
    //     const totalSupply: number = await archOfPeace.totalSupply();

    //     for (let i: number = 0; i < totalSupply; i++) {
    //         expect(await archOfPeace.tokenURI(i)).to.equal(veilURI);
    //     }
    // });

    it(
        'MUST reveal successfully (i.e. receive randomness successfully)'
        // , async () => {
        //     const requestId: BigNumber = BigNumber.from(1);

        //     await expect(archOfPeace.reveal())
        //         .to.emit(archOfPeace, 'RandomnessRequested')
        //         .withArgs(requestId)
        //         .and.to.emit(vrfCoordinatorV2Mock, 'RandomWordsRequested');

        //     await expect(
        //         vrfCoordinatorV2Mock.fulfillRandomWords(
        //             requestId,
        //             archOfPeace.address
        //         )
        //     ).to.emit(vrfCoordinatorV2Mock, 'RandomWordsFulfilled');
        // }
    );

    it(
        'MUST show each token as revealed Arch of Peace'
        // , async () => {
        //     const totalSupply: number = await archOfPeace.totalSupply();

        //     let mappedMetadataIds: Set<number> = new Set<number>();

        //     for (let i: number = 0; i < totalSupply; i++) {
        //         const tokenURI: string = await archOfPeace.tokenURI(i);
        //         expect(tokenURI.startsWith(baseURI)).to.be.true;
        //         expect(tokenURI.length).to.be.greaterThan(baseURI.length);

        //         const mappedMetadataId: number = Number(
        //             tokenURI.slice(baseURI.length)
        //         );
        //         expect(mappedMetadataId).to.not.be.NaN;
        //         expect(mappedMetadataIds.has(mappedMetadataId)).to.be.false;

        //         mappedMetadataIds.add(mappedMetadataId);
        //     }

        //     expect(Math.min(...mappedMetadataIds)).to.equal(0);
        //     expect(Math.max(...mappedMetadataIds)).to.equal(totalSupply - 1);
        // }
    );

    it('MUST NOT allow another reveal');

    it('MUST allow token burn');
});

// const paths: Array<Array<number>> = [
//     [0, 0, 1, 0],
//     [0, 0, 0, 1, 0],
//     [0, 0, 0, 0, 1, 0],
//     [0, 0, 0, 0, 0, 0],
// ];
