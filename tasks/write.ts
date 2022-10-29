import { types, task } from 'hardhat/config';

import write from '../scripts/write';

task('write', 'Deploys Arch Of Peace Smartcontract')
    .addParam(
        'address',
        'Monuverse Episode Contract Address',
        undefined,
        types.string
    )
    .setAction(async (args, hre) => {
        await write(args.address, hre);
    });

/*
npx hardhat --write-episode \
    --address "0x4F9ce36c52680123273b6DD0C454339D87e51f79" \
    --network goerli
*/
