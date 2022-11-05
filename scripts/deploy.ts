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

    // TODO: PRE
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
        [
            '0x3F67eF2A79afc3Ca2620475Ed1E3118f00996F0C',
            '0x15d222820bcbbf01d9de6637D1946CB119059d54',
            '0xf16AcBA903FBD5f1FF0A7aA426994806C579Ec7F',
        ],
        [2786, 3607, 3607]
    );
    await archOfPeace.deployed();
    console.log('> ArchOfPeace deployed at', archOfPeace.address);

    const contractVerification = await new Promise((resolve) => {
        setTimeout(async () => {
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
                    [
                        '0x3F67eF2A79afc3Ca2620475Ed1E3118f00996F0C',
                        '0x15d222820bcbbf01d9de6637D1946CB119059d54',
                        '0xf16AcBA903FBD5f1FF0A7aA426994806C579Ec7F',
                    ],
                    [2786, 3607, 3607],
                ],
            });

            resolve(true);
        }, 30000);
    });

    console.log(contractVerification);
}

export default deployArchOfPeace;
