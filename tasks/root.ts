import { types, task } from 'hardhat/config';

import whitelist from '../scripts/whitelist';

task('whitelist', 'Update Arch Of Peace Whitelist Merkle Root')
    .addParam(
        'address',
        'Monuverse Episode Contract Address',
        undefined,
        types.string
    )
    .addParam('root', 'hex string Merkle Root', undefined, types.string)
    .setAction(async (args, hre) => {
        const root = Buffer.from(args.root, 'hex');
        await whitelist(args.address, root, hre);
    });

/*
npx hardhat --write-episode \
    --address "0x4F9ce36c52680123273b6DD0C454339D87e51f79" \
    --network goerli
*/
