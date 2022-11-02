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
        await whitelist(args.address, args.root, hre);
    });

/*
npx hardhat whitelist \
    --address "0x4F9ce36c52680123273b6DD0C454339D87e51f79" \
    --root "ddde96eaf0e0d4fe230716757dfdc482f93f26f25abe7cd4ac06bebb55c0c68c" \
    --network goerli
*/
