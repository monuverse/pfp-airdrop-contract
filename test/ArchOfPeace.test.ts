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
        label: 'The Big Monubang',
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
            rules: [{ label: 'Builders', enabled: true, fixedPrice: true }],
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
                { label: 'Builders', enabled: true, fixedPrice: true },
                { label: 'Chosen Ones', enabled: true, fixedPrice: false },
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
            rules: [{ label: 'Builders', enabled: true, fixedPrice: true }],
            isOpen: false,
        },
        revealing: false,
    },
    {
        label: 'A Monumental Arch Reveal',
        whitelisting: false,
        minting: { limit: 0, price: 0, rules: [], isOpen: false },
        revealing: true,
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
        from: 'The Big Monubang',
        event: 'EpisodeProgressedOnlife',
        to: 'The Builders',
    },
    {
        from: 'The Builders',
        event: 'EpisodeProgressedOnlife',
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
        to: 'A Monumental Arch Reveal',
    },
    {
        from: 'The Brave',
        event: 'EpisodeMinted',
        to: 'A Monumental Arch Reveal',
    },
    {
        from: 'A Monumental Arch Reveal',
        event: 'EpisodeRevealed',
        to: 'To The Monuverse',
    },
];

describe('CONTRACT ArchOfPeace', async () => {
    // Actors that will interact with Smartcontracts
    let monuverse: SignerWithAddress;
    let hacker: SignerWithAddress;
    let users: SignerWithAddress[];

    // Arch Of Peace
    const name: string = 'Monutest';
    const symbol: string = 'MNT';
    const veilURI: string = 'test:veilURI_unique';
    const baseURI: string = 'test:baseURI_';
    const maxSupply: number = 77;
    let archOfPeace: Contract;

    // Chapters
    // const chapters

    /**
     *  before start
     *      ...DFA config
     *  after start
     *      before reveal
     *          ...minting
     *      after reveal
     *          !...minting
     */

    // Chainlink VRF V2
    const vrfSubscriptionId: number = 1;
    const vrfGaslane: Buffer = Buffer.from(
        'd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
        'hex'
    );
    let vrfCoordinatorV2Mock: Contract;

    before(async () => {
        [monuverse, hacker, ...users] = await ethers.getSigners();

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
    });

    beforeEach(async () => {
        await archOfPeace.connect(monuverse);
    });

    // context('Episode is being built');

    // transform into before each after transition?

    it('MUST write all Episode Chapters', async () => {
        for (let i: number = 0; i < episode.length; i++) {
            await (
                await archOfPeace.writeChapter(
                    episode[i].label,
                    episode[i].whitelisting,
                    episode[i].minting.limit,
                    ethers.utils.parseUnits(
                        episode[0].minting.price.toString(),
                        'ether'
                    ),
                    episode[i].minting.isOpen,
                    episode[i].revealing
                )
            ).wait();
        }
    });

    // context('Episode Environments', async () => {
    //     for (let i: number = 0; i < episode.length; i++) {
    //         context(`Chapter "${episode[i].label}"`, async () => {
    //             episode[i].whitelisting
    //                 ? it('MUST allow whitelisting', async () => {})
    //                 : it('MUST NOT allow whitelisting');

    //             episode[i].minting.limit > 0
    //                 ? it('Must allow minting')
    //                 : it('MUST NOT allow minting');

    //             episode[i].revealing
    //                 ? it('MUST allow revealing', async () => {
    //                       // expect minting to be disabled
    //                   })
    //                 : it('MUST NOT allow revealing');
    //         });
    //     }
    // });
    // context('Episode Transitions');

    context('Before Reveal', () => {
        it('MUST allow all users to mint multiple tokens at once'
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

        it('MUST only show unrevealed arch', async () => {
            const totalSupply: number = await archOfPeace.totalSupply();

            for (let i: number = 0; i < totalSupply; i++) {
                expect(await archOfPeace.tokenURI(i)).to.equal(veilURI);
            }
        });

        it('MUST reveal successfully (i.e. receive randomness successfully)'
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
    });

    context('After Reveal', () => {
        it('MUST show each token as revealed Arch of Peace'
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
});

// dfa
//
