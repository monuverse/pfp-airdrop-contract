import { expect } from 'chai';

import { ethers } from 'hardhat';
import { Contract, BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

type MintGroupRules = {
    label: string;
    enabled: boolean;
    fixedPrice: boolean;
};

type Minting = {
    limit: number;
    price: number;
    rules: Array<MintGroupRules>;
    isOpen: boolean;
};

type Chapter = {
    label: string;
    minting: Minting;
    whitelisting: boolean;
    revealing: boolean;
};

type Transition = {
    from: string;
    event: string;
    to: string;
};

const episode: Array<Chapter> = [
    {
        label: 'The Big Bang',
        whitelisting: true,
        minting: { limit: 0, price: 0, rules: [], isOpen: false },
        revealing: false,
    },
    {
        label: 'The Builders',
        whitelisting: true,
        minting: { limit: 777, price: 0, rules: [], isOpen: false },
        revealing: false,
    },
    {
        label: 'The Chosen Ones',
        whitelisting: true,
        minting: {
            limit: 3777,
            price: 0.09,
            rules: [{ label: 'The Builders', enabled: true, fixedPrice: true }],
            isOpen: false,
        },
        revealing: false,
    },
    {
        label: 'The Believers',
        whitelisting: false,
        minting: {
            limit: 7777,
            price: 0.11,
            rules: [
                { label: 'The Builders', enabled: true, fixedPrice: true },
                { label: 'The Chosen Ones', enabled: true, fixedPrice: false },
            ],
            isOpen: false,
        },
        revealing: false,
    },
    {
        label: 'The Brave',
        whitelisting: false,
        minting: {
            limit: 7777,
            price: 0.12,
            rules: [{ label: 'The Builders', enabled: true, fixedPrice: true }],
            isOpen: false,
        },
        revealing: false,
    },
    {
        label: 'Monumental Reveal',
        whitelisting: false,
        minting: { limit: 0, price: 0, rules: [], isOpen: false },
        revealing: false,
    },
    {
        label: 'To The Monuverse',
        whitelisting: false,
        minting: { limit: 0, price: 0, rules: [], isOpen: false },
        revealing: false,
    },
];

const branching: Array<Transition> = [
    {
        from: 'The Big Bang',
        event: 'EpisodeProgressedOnlife',
        to: 'The Builders',
    },
    {
        from: 'The Builders',
        event: 'EpisodeProgressedOnlife',
        to: 'The Builders',
    },
    {
        from: 'The Builders',
        event: 'ChapterMinted',
        to: 'The Chosen Ones',
    },
    {
        from: 'The Chosen Ones',
        event: 'EpisodeProgressedOnlife',
        to: 'The Believers',
    },
    {
        from: 'The Believers',
        event: 'EpisodeProgressedOnlife',
        to: 'The Brave',
    },
    {
        from: 'The Brave',
        event: 'EpisodeProgressedOnlife',
        to: 'Monumental Reveal',
    },
    {
        from: 'The Brave',
        event: 'EpisodeMinted',
        to: 'Monumental Reveal',
    },
    {
        from: 'Monumental Reveal',
        event: 'EpisodeRevealed',
        to: 'To The Monuverse',
    },
    {
        from: 'To The Monuverse',
        event: 'EpisodeProgressedOnlife',
        to: 'The Builders',
    },
];

const hashStr = (value: string) =>
    ethers.utils.solidityKeccak256(['string'], [value]);

describe('CONTRACT MonuverseEpisode', async () => {
    let owner: SignerWithAddress;
    let hacker: SignerWithAddress;

    let monuverseEpisode: Contract;

    const senderNotOwnerError: string = 'Ownable: caller is not the owner';
    const updatesForbiddenError: string = 'MonuverseEpisode: updates forbidden';

    before(async () => {
        expect(episode.length).to.be.greaterThan(0);

        [owner, hacker] = await ethers.getSigners();

        const MonuverseEpisodeMock = await ethers.getContractFactory(
            'MonuverseEpisodeMock'
        );

        monuverseEpisode = await MonuverseEpisodeMock.deploy(episode[0].label);

        await monuverseEpisode.deployed();

        expect(await monuverseEpisode.initialChapter()).to.equal(
            hashStr(episode[0].label)
        );
    });

    beforeEach(async () => {
        await monuverseEpisode.connect(owner);
    });

    context('During Episode Configuration (in Initial Chapter)', () => {
        after(
            'Closes Episode Configuration (transitions from Initial Chapter)',
            async () => {
                const initial = await monuverseEpisode.initialChapter();
                let current = await monuverseEpisode.currentChapter();

                if (initial == current) {
                    await expect(
                        monuverseEpisode['emitOnlifeMonumentalEvent()']()
                    )
                        .to.emit(monuverseEpisode, 'EpisodeProgressedOnlife')
                        .withArgs(
                            hashStr(episode[0].label),
                            hashStr(episode[1].label)
                        );
                }

                current = await monuverseEpisode.currentChapter();

                expect(initial).to.not.equal(current);
                expect(current).to.equal(hashStr(episode[1].label));
            }
        );

        it('MUST allow Chapter writing', async () => {
            for (let i: number = 0; i < episode.length; i++) {
                await expect(
                    monuverseEpisode.writeChapter(
                        episode[i].label,
                        episode[i].whitelisting,
                        episode[i].minting.limit,
                        ethers.utils.parseUnits(
                            episode[i].minting.price.toString(),
                            'ether'
                        ),
                        episode[i].minting.isOpen,
                        episode[i].revealing
                    )
                )
                    .to.emit(monuverseEpisode, 'ChapterWritten')
                    .withArgs(
                        episode[i].label,
                        episode[i].whitelisting,
                        episode[i].minting.limit,
                        ethers.utils.parseUnits(
                            episode[i].minting.price.toString(),
                            'ether'
                        ),
                        episode[i].minting.isOpen,
                        episode[i].revealing
                    );
            }
        });

        it('MUST allow Chapter rewriting', async () => {
            for (let i: number = 0; i < episode.length; i++) {
                await expect(
                    monuverseEpisode.writeChapter(
                        episode[i].label,
                        episode[i].whitelisting,
                        episode[i].minting.limit,
                        ethers.utils.parseUnits(
                            episode[i].minting.price.toString(),
                            'ether'
                        ),
                        episode[i].minting.isOpen,
                        episode[i].revealing
                    )
                )
                    .to.emit(monuverseEpisode, 'ChapterWritten')
                    .withArgs(
                        episode[i].label,
                        episode[i].whitelisting,
                        episode[i].minting.limit,
                        ethers.utils.parseUnits(
                            episode[i].minting.price.toString(),
                            'ether'
                        ),
                        episode[i].minting.isOpen,
                        episode[i].revealing
                    );
            }
        });

        it('MUST allow Chapter writing only to Owner', async () =>
            await expect(
                monuverseEpisode
                    .connect(hacker)
                    .writeChapter(
                        episode[0].label,
                        episode[0].whitelisting,
                        episode[0].minting.limit,
                        ethers.utils.parseUnits(
                            episode[0].minting.price.toString(),
                            'ether'
                        ),
                        episode[0].minting.isOpen,
                        episode[0].revealing
                    )
            ).to.be.revertedWith(senderNotOwnerError));

        it('MUST NOT allow Chapter writing with both Revealing and Minting enabled', async () => {
            const brokenChapter: Chapter = {
                label: 'To The Monuverse',
                whitelisting: false,
                minting: { limit: 10, price: 0, rules: [], isOpen: false },
                revealing: true,
            };

            await expect(
                monuverseEpisode.writeChapter(
                    brokenChapter.label,
                    brokenChapter.whitelisting,
                    brokenChapter.minting.limit,
                    ethers.utils.parseUnits(
                        brokenChapter.minting.price.toString(),
                        'ether'
                    ),
                    brokenChapter.minting.isOpen,
                    brokenChapter.revealing
                )
            ).to.revertedWith('MonuverseEpisode: reveal with mint forbidden');
        });

        it('MUST allow Mint Group writing', async () => {
            for (let e: number = 0; e < episode.length; e++) {
                const rules: Array<MintGroupRules> = episode[e].minting.rules;

                for (let r: number = 0; r < rules.length; r++) {
                    await expect(
                        monuverseEpisode.writeMintGroup(
                            episode[e].label,
                            rules[r].label,
                            {
                                enabled: rules[r].enabled,
                                fixedPrice: rules[r].fixedPrice,
                            }
                        )
                    )
                        .to.emit(monuverseEpisode, 'MintGroupWritten')
                        .withArgs(
                            episode[e].label,
                            rules[r].label,
                            rules[r].fixedPrice
                        );
                }
            }
        });

        it('MUST allow Mint Group rewriting', async () => {
            for (let e: number = 0; e < episode.length; e++) {
                const rules: Array<MintGroupRules> = episode[e].minting.rules;

                for (let r: number = 0; r < rules.length; r++) {
                    await expect(
                        monuverseEpisode.writeMintGroup(
                            episode[e].label,
                            rules[r].label,
                            {
                                enabled: rules[r].enabled,
                                fixedPrice: rules[r].fixedPrice,
                            }
                        )
                    )
                        .to.emit(monuverseEpisode, 'MintGroupWritten')
                        .withArgs(
                            episode[e].label,
                            rules[r].label,
                            rules[r].fixedPrice
                        );
                }
            }
        });

        it('MUST allow Mint Group writing only to Owner', async () => {
            for (let e: number = 0; e < episode.length; e++) {
                const rules: Array<MintGroupRules> = episode[e].minting.rules;

                for (let r: number = 0; r < rules.length; r++) {
                    await expect(
                        monuverseEpisode
                            .connect(hacker)
                            .writeMintGroup(episode[e].label, rules[r].label, {
                                enabled: rules[r].enabled,
                                fixedPrice: rules[r].fixedPrice,
                            })
                    ).to.be.revertedWith(senderNotOwnerError);
                }
            }
        });

        it("MUST NOT allow Mint Group writing if Chapter with same label doesn't exist", async () => {
            for (let e: number = 0; e < episode.length; e++) {
                const rules: Array<MintGroupRules> = episode[e].minting.rules;

                for (let r: number = 0; r < rules.length; r++) {
                    await expect(
                        monuverseEpisode.writeMintGroup(
                            episode[e].label,
                            'Non Existent Group',
                            {
                                enabled: true,
                                fixedPrice: true,
                            }
                        )
                    ).to.be.revertedWith(
                        'MonuverseEpisode: group non existent'
                    );
                }
            }
        });

        it('MUST NOT allow Mint Group writing if minting disabled', async () => {
            let disabledMintingExists: boolean = false;

            for (let e: number = 0; e < episode.length; e++) {
                if (episode[e].minting.limit == 0) {
                    disabledMintingExists = true;

                    await expect(
                        monuverseEpisode.writeMintGroup(
                            episode[e].label,
                            'The Brave',
                            {
                                enabled: true,
                                fixedPrice: true,
                            }
                        )
                    ).to.be.revertedWith(
                        'MonuverseEpisode: chapter mint disabled'
                    );
                }
            }

            expect(disabledMintingExists).to.be.true;
        });

        it('MUST allow Story Branching writing (i.e. Chapter transitions)', async () => {
            for (let i: number = 0; i < branching.length; i++) {
                await expect(
                    monuverseEpisode.writeTransition(
                        branching[i].from,
                        branching[i].to,
                        branching[i].event
                    )
                )
                    .to.emit(monuverseEpisode, 'TransitionWritten')
                    .withArgs(
                        branching[i].from,
                        branching[i].to,
                        branching[i].event
                    );
            }
        });

        it('MUST NOT allow Story Branching rewriting (non-determinism introduction risk)', async () => {
            for (let i: number = 0; i < branching.length; i++) {
                await expect(
                    monuverseEpisode.writeTransition(
                        branching[i].from,
                        branching[i].to,
                        branching[i].event
                    )
                ).to.be.revertedWith('DFA: existent transition');
            }
        });

        it('MUST NOT allow Story Branching Writing for non existent Chapters', async () => {
            for (let i: number = 0; i < branching.length; i++) {
                await expect(
                    monuverseEpisode.writeTransition(
                        'Non Existent Chapter',
                        branching[i].to,
                        branching[i].event
                    )
                ).to.be.revertedWith('MonuverseEpisode: from not set');

                await expect(
                    monuverseEpisode.writeTransition(
                        branching[i].from,
                        'Non Existent Chapter',
                        branching[i].event
                    )
                ).to.be.revertedWith('MonuverseEpisode: to not set');
            }
        });

        it('MUST NOT allow Story Branching Writing to non-Owner', async () => {
            for (let i: number = 0; i < branching.length; i++) {
                await expect(
                    monuverseEpisode
                        .connect(hacker)
                        .writeTransition(
                            branching[i].from,
                            branching[i].to,
                            branching[i].event
                        )
                ).to.be.revertedWith(senderNotOwnerError);
            }
        });

        // it('MUST NOT allow Story Branching Removal to non-Owner', async () => {
        //     for (let i: number = 0; i < branching.length; i++) {
        //         await expect(
        //             monuverseEpisode
        //                 .connect(hacker)
        //                 .removeTransition(branching[i].from, branching[i].to)
        //         ).to.be.revertedWith(senderNotOwnerError);
        //     }
        // });

        // it('MUST allow Story Branching Removal', async () => {
        //     for (let i: number = 0; i < branching.length; i++) {
        //         await expect(
        //             monuverseEpisode.removeTransition(
        //                 branching[i].from,
        //                 branching[i].event
        //             )
        //         )
        //             .to.emit(monuverseEpisode, 'TransitionRemoved')
        //             .withArgs(branching[i].from, branching[i].event);
        //     }
        // });

        // it('MUST NOT allow Mint Group Removal to non-Owners', async () => {
        //     for (let e: number = 0; e < episode.length; e++) {
        //         const rules: Array<MintGroupRules> = episode[e].minting.rules;

        //         for (let r: number = 0; r < rules.length; r++) {
        //             await expect(
        //                 monuverseEpisode
        //                     .connect(hacker)
        //                     .removeMintGroup(episode[e].label, rules[r].label)
        //             ).to.be.revertedWith(senderNotOwnerError);
        //         }
        //     }
        // });

        // it('MUST allow Mint Group removal', async () => {
        //     for (let e: number = 0; e < episode.length; e++) {
        //         const rules: Array<MintGroupRules> = episode[e].minting.rules;

        //         for (let r: number = 0; r < rules.length; r++) {
        //             await expect(
        //                 monuverseEpisode.removeMintGroup(
        //                     episode[e].label,
        //                     rules[r].label
        //                 )
        //             )
        //                 .to.emit(monuverseEpisode, 'MintGroupRemoved')
        //                 .withArgs(episode[e].label, rules[r].label);

        //             let removedGroup = await monuverseEpisode.mintGroup(
        //                 episode[e].label,
        //                 rules[r].label
        //             );

        //             expect(removedGroup[0]).to.be.false;
        //             expect(removedGroup[1]).to.be.false;
        //         }
        //     }
        // });

        // it('MUST NOT allow Chapter removal to non-Owner', async () =>
        //     await expect(
        //         monuverseEpisode.connect(hacker).removeChapter(episode[0].label)
        //     ).to.be.revertedWith(senderNotOwnerError));

        // it('MUST NOT allow initial Chapter Removal', async () => {
        //     await expect(
        //         monuverseEpisode.removeChapter(episode[0].label)
        //     ).to.be.revertedWith('MonuverseEpisode: initial non deletable');
        // });

        // it('MUST allow Chapter removal', async () => {
        //     for (let i: number = 1; i < episode.length; i++) {
        //         await expect(monuverseEpisode.removeChapter(episode[i].label))
        //             .to.emit(monuverseEpisode, 'ChapterRemoved')
        //             .withArgs(episode[i].label);
        //     }
        // });
    });

    context('When Episode is Running (Post-Configuration)', () => {
        it('MUST NOT allow Episode Writing outside inital Chapter', async () => {
            await expect(
                monuverseEpisode.writeChapter(
                    episode[0].label,
                    episode[0].whitelisting,
                    episode[0].minting.limit,
                    ethers.utils.parseUnits(
                        episode[0].minting.price.toString(),
                        'ether'
                    ),
                    episode[0].minting.isOpen,
                    episode[0].revealing
                )
            ).to.be.revertedWith(updatesForbiddenError);

            let mintingGroupExists: boolean = false;
            for (let e: number = 0; e < episode.length; e++) {
                if (episode[e].minting.rules.length > 0) {
                    mintingGroupExists = true;

                    await expect(
                        monuverseEpisode.writeMintGroup(
                            episode[e].label,
                            episode[e].minting.rules[0].label,
                            {
                                enabled: episode[e].minting.rules[0].enabled,
                                fixedPrice:
                                    episode[e].minting.rules[0].fixedPrice,
                            }
                        )
                    ).to.be.revertedWith(updatesForbiddenError);
                }
            }
            expect(mintingGroupExists).to.equal(true);

            await expect(
                monuverseEpisode.writeTransition(
                    branching[0].from,
                    branching[0].to,
                    branching[0].event
                )
            ).to.be.revertedWith(updatesForbiddenError);

            await expect(
                monuverseEpisode.removeTransition(
                    branching[0].from,
                    branching[0].event
                )
            ).to.be.revertedWith(updatesForbiddenError);

            for (let e: number = 0; e < episode.length; e++) {
                if (episode[e].minting.rules.length > 0) {
                    mintingGroupExists = true;

                    await expect(
                        monuverseEpisode.removeMintGroup(
                            episode[e].label,
                            episode[e].minting.rules[0].label
                        )
                    ).to.be.revertedWith(updatesForbiddenError);
                }
            }

            await expect(
                monuverseEpisode.removeChapter(episode[0].label)
            ).to.be.revertedWith(updatesForbiddenError);
        });

        it("MUST remain in current Chapter if transition doesn't exist", async () =>
            await expect(
                monuverseEpisode['emitOnlifeMonumentalEvent(string)'](
                    'EpisodeMinted'
                )
            )
                .to.emit(monuverseEpisode, 'EpisodeMinted')
                .withArgs(
                    '0x0000000000000000000000000000000000000000000000000000000000000000',
                    hashStr(episode[1].label)
                ));

        it("MUST revert if Monumental Event doesn't exist", async () =>
            await expect(
                monuverseEpisode['emitOnlifeMonumentalEvent(string)'](
                    'NonExistentEvent'
                )
            ).to.be.revertedWith('MonuverseEpisode: event non existent'));

        it('MUST remain in current Chapter if transition destination is the same', async () =>
            await expect(
                monuverseEpisode['emitOnlifeMonumentalEvent(string)'](
                    'EpisodeProgressedOnlife'
                )
            )
                .to.emit(monuverseEpisode, 'EpisodeProgressedOnlife')
                .withArgs(
                    hashStr(episode[1].label),
                    hashStr(episode[1].label)
                ));

        it('MUST transtion into correct Chapter by emitting Monumental Event', async () =>
            await expect(
                monuverseEpisode['emitOnlifeMonumentalEvent(string)'](
                    'ChapterMinted'
                )
            )
                .to.emit(monuverseEpisode, 'ChapterMinted')
                .withArgs(
                    hashStr(episode[1].label),
                    hashStr(episode[2].label)
                ));

        it('MUST transtion into correct Chapter by emitting Onlife Monumental Event', async () =>
            await expect(monuverseEpisode['emitOnlifeMonumentalEvent()']())
                .to.emit(monuverseEpisode, 'EpisodeProgressedOnlife')
                .withArgs(
                    hashStr(episode[2].label),
                    hashStr(episode[3].label)
                ));

        it('SHOULD NOT transition away from Final Chapter');

        it('MUST allow sound Onlife Events emission', async () => {});

        it('MUST allow sound Onlife Events emission only to Owner');
    });

    context(
        'During Episode Configuration or after returning to Episode Configuration from another Chapter',
        () => {}
    );
});
