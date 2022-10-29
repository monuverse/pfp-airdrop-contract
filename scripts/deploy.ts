import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { episode } from '../episode';

async function deployArchOfPeace(
    maxSupply: number,
    name: string,
    symbol: string,
    veilUri: string,
    baseUri: string,
    vrfCoordinator: string,
    vrfGaslane: Buffer,
    vrfSubscription: number,
    hre: HardhatRuntimeEnvironment
) {
    await hre.run('compile');

    console.log(
        'Deployment is about to start with following arguments:',
        maxSupply,
        name,
        symbol,
        veilUri,
        baseUri,
        episode[0].label,
        vrfCoordinator,
        vrfGaslane,
        vrfSubscription
    );

    const ArchOfPeace = await hre.ethers.getContractFactory('ArchOfPeace');
    const archOfPeace = await ArchOfPeace.deploy(
        maxSupply,
        name,
        symbol,
        veilUri,
        baseUri,
        episode[0].label,
        vrfCoordinator,
        vrfGaslane,
        vrfSubscription,
        { nonce: 2 }
    );
    await archOfPeace.deployed();
    console.log('> ArchOfPeace deployed at', archOfPeace.address);

    await hre.run('verify:verify', {
        address: archOfPeace.address,
        constructorArguments: [
            maxSupply,
            name,
            symbol,
            veilUri,
            baseUri,
            episode[0].label,
            vrfCoordinator,
            vrfGaslane,
            vrfSubscription,
        ],
    });
}

export default deployArchOfPeace;
