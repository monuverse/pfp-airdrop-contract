import { expect } from 'chai';

import { ethers } from 'hardhat';
import { Contract, BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('ArchOfPeace Contract', () => {
    // Actors that will interact with Smartcontracts
    let monuverse: SignerWithAddress;
    let hacker: SignerWithAddress;
    let users: SignerWithAddress[];

    // Chainlink VRF V2
    const vrfSubscriptionId: number = 1;
    const vrfGaslane: Buffer = Buffer.from(
        'd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
        'hex'
    );
    let vrfCoordinatorV2Mock: Contract;

    // Arch Of Light
    const name: string = 'Monutest';
    const symbol: string = 'MNT';
    const veilURI: string = 'test:veilURI_unique';
    const baseURI: string = 'test:baseURI_';
    const maxSupply: number = 77;
    let archOfLight: Contract;

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
        archOfLight = await ArchOfPeace.deploy(
            maxSupply,
            name,
            symbol,
            veilURI,
            baseURI,
            vrfCoordinatorV2Mock.address,
            vrfGaslane,
            vrfSubscriptionId
        );
        await archOfLight.deployed();

        vrfCoordinatorV2Mock.addConsumer(
            vrfSubscriptionId,
            archOfLight.address
        );
    });

    beforeEach(async () => {
        await archOfLight.connect(monuverse);
    });

    context('Before Reveal', () => {
        it('MUST allow all users to mint multiple tokens at once', async () => {
            const userAllocation = Math.floor(maxSupply / users.length);

            for (let i: number = 0; i < users.length; i++) {
                await (
                    await archOfLight.connect(users[i]).mint(userAllocation)
                ).wait();

                expect(await archOfLight.balanceOf(users[i].address)).to.equal(
                    userAllocation
                );
            }
        });

        it('MUST only show veiled arch', async () => {
            const totalSupply: number = await archOfLight.totalSupply();

            for (let i: number = 0; i < totalSupply; i++) {
                expect(await archOfLight.tokenURI(i)).to.equal(veilURI);
            }
        });

        it('MUST unveil successfully (i.e. receive randomness successfully)', async () => {
            const requestId: BigNumber = BigNumber.from(1);

            await expect(archOfLight.unveil())
                .to.emit(archOfLight, 'RandomnessRequested')
                .withArgs(requestId)
                .and.to.emit(vrfCoordinatorV2Mock, 'RandomWordsRequested');

            await expect(
                vrfCoordinatorV2Mock.fulfillRandomWords(
                    requestId,
                    archOfLight.address
                )
            ).to.emit(vrfCoordinatorV2Mock, 'RandomWordsFulfilled');
        });
    });

    context('After Reveal', () => {
        it('MUST show each token as unveiled Arch of Light', async () => {
            const totalSupply: number = await archOfLight.totalSupply();

            let mappedMetadataIds: Set<number> = new Set<number>();

            for (let i: number = 0; i < totalSupply; i++) {
                const tokenURI: string = await archOfLight.tokenURI(i);
                expect(tokenURI.startsWith(baseURI)).to.be.true;
                expect(tokenURI.length).to.be.greaterThan(baseURI.length);

                const mappedMetadataId: number = Number(
                    tokenURI.slice(baseURI.length)
                );
                expect(mappedMetadataId).to.not.be.NaN;
                expect(mappedMetadataIds.has(mappedMetadataId)).to.be.false;

                mappedMetadataIds.add(mappedMetadataId);
            }

            expect(Math.min(...mappedMetadataIds)).to.equal(0);
            expect(Math.max(...mappedMetadataIds)).to.equal(totalSupply - 1);
        });

        it('MUST NOT allow another unveil');
    });
});

// dfa
//
