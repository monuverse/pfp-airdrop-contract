import { types, task } from 'hardhat/config';

import deployArchOfPeace from '../scripts/deploy';

task('deploy', 'Deploys Arch Of Peace Smartcontract')
    .addParam('maxSupply', 'Maximum NFT Supply', undefined, types.int)
    .addParam('name', 'NFT Name', undefined, types.string)
    .addParam('symbol', 'NFT Symbol', undefined, types.string)
    .addParam('veilUri', 'Unique URI of the Arch Veil', undefined, types.string)
    .addParam('baseUri', 'Base URI for revealed Arch', undefined, types.string)
    .addParam(
        'vrfCoordinator',
        'VRF V2 Coordinator Address',
        undefined,
        types.string
    )
    .addParam('vrfGaslane', 'VRF Gaslane', undefined, types.string)
    .addParam('vrfSubscription', 'VRF Subscription Id', undefined, types.int)
    .setAction(async (args, hre) => {
        await deployArchOfPeace(
            args.maxSupply,
            args.name,
            args.symbol,
            args.veilUri,
            args.baseUri,
            args.vrfCoordinator,
            Buffer.from(args.vrfGaslane, 'hex'),
            args.vrfSubscription,
            hre
        );
    });

/*
npx hardhat deploy \
    --max-supply 777 \
    --name "TestOfPeace" \
    --symbol "TOP" \
    --veil-uri "URI:veil" \
    --base-uri "URI:base" \
    --vrf-coordinator "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D" \
    --vrf-gaslane "79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15" \
    --vrf-subscription 5471 \
    --network goerli
*/