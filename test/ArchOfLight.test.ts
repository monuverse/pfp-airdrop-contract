import { assert, expect } from 'chai';

import { ethers } from 'hardhat';
import { Contract, BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('ArchOfLight Contract', () => {
    let owner: SignerWithAddress;
    let hacker: SignerWithAddress;
    let users: SignerWithAddress[];

    const vrfSubscriptionId: number = 1;
    const vrfGaslane: Buffer = Buffer.from(
        'd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
        'hex'
    );
    let vrfCoordinatorV2Mock: Contract;

    const name: string = 'Monutest';
    const symbol: string = 'MNT';
    const veilURI: string = 'veil:test';
    const baseURI: string = 'unveil:test';
    let archOfLight: Contract;

    before(async () => {
        [owner, hacker, ...users] = await ethers.getSigners();

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

        const ArchOfLight = await ethers.getContractFactory('ArchOfLight');
        archOfLight = await ArchOfLight.deploy(
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

    it('MUST allow multiple users to mint tokens', async () => {
        await (await archOfLight.connect(users[0]).mint(3)).wait();
        await (await archOfLight.connect(users[1]).mint(6)).wait();
        await (await archOfLight.connect(users[2]).mint(2)).wait();

        expect(await archOfLight.balanceOf(users[2].address)).to.equal(2);
        expect(await archOfLight.tokenURI(0)).to.equal(veilURI);
    });

    // it('Contract should request Random numbers successfully', async () => {
    //     await expect(archOfLight.connect(owner).unveilArch())
    //         .to.emit(archOfLight, 'RequestedRandomness')
    //         .withArgs(BigNumber.from(1), owner.address, 'Halley');
    // });

    // it('Coordinator should successfully receive the request', async function () {
    //     await expect(archOfLight.safeMint('Halley')).to.emit(
    //         vrfCoordinatorV2Mock,
    //         'RandomWordsRequested'
    //     );
    // });

    it('MUST perform a token reveal', async () => {
        await (await archOfLight.connect(owner).unveilArch()).wait();

        await expect(archOfLight.safeMint('Halley')).to.emit(
            vrfCoordinatorV2Mock,
            'RandomWordsRequested'
        );
        // await new Promise((resolve) => setTimeout(resolve, 5000));

        const uri = await archOfLight.tokenURI(6);
        console.log(uri);

        expect(uri).to.not.equal(veilURI);
    });
});
