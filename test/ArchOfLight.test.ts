import { assert, expect } from 'chai';

import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('ArchOfLight Contract', () => {
    let owner: SignerWithAddress;
    let hacker: SignerWithAddress;
    let users: SignerWithAddress[];

    let vrfSubscriptionId: number;
    const vrfGaslane: Buffer = Buffer.from(
        'd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
        'hex'
    );
    let vrfCoordinatorV2Mock: Contract;

    const name: string = '';
    const symbol: string = '';
    const veilURI: string = '';
    const baseURI: string = '';
    let archOfLight: Contract;

    before(async () => {
        [owner, hacker, ...users] = await ethers.getSigners();

        const ArchOfLight = await ethers.getContractFactory('ArchOfLight');
        const VRFCoordinatorV2Mock = await ethers.getContractFactory(
            'VRFCoordinatorV2Mock'
        );

        vrfCoordinatorV2Mock = await vrfCoordinatorV2Mock.deploy(0, 0);
        await vrfCoordinatorV2Mock.deployed();

        vrfSubscriptionId = await vrfCoordinatorV2Mock.createSubscription();

        await vrfCoordinatorV2Mock.fundSubscription(
            1,
            ethers.utils.parseEther('5')
        );

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
    });

    it('MUST allow multiple users to mint tokens', async () => {
        await archOfLight.connect(users[0]).mint(3);
        await archOfLight.connect(users[1]).mint(6);
        await archOfLight.connect(users[2]).mint(2);

        expect(await archOfLight.balanceOf()).to.equal(2);
        expect(await archOfLight.tokenURI()).to.equal(veilURI);
    });

    it('MUST perform a token reveal');
});
