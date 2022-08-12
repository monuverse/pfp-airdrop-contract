import { task, types } from 'hardhat/config';

export default task('deploy', 'deploys random words consumer')
    .addParam('name', 'NFT Name', undefined, types.string)
    .addParam('symbol', 'NFT Symbol', undefined, types.string)
    .setAction(async (args, hre) => {
        await hre.run("compile");

        const Test = await hre.ethers.getContractFactory('Test');
        const test = await Test.deploy(args.name, args.symbol);

        await test.deployed();

        console.log('Test deployed at', test.address);
    });
