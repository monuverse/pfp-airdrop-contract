import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
    TransactionReceipt,
    TransactionResponse,
} from '@ethersproject/providers';

const whitelist = async function (
    address: string,
    root: Buffer,
    hre: HardhatRuntimeEnvironment
) {
    const ArchOfPeace = await hre.ethers.getContractFactory('ArchOfPeace');
    const archOfPeace = await ArchOfPeace.attach(address);

    const updateTx: TransactionResponse = await archOfPeace.setWhitelistRoot(
        root
    );
    const updateTxReceipt: TransactionReceipt = await updateTx.wait();
    const onchainRoot = (await archOfPeace.whitelistRoot()).slice(2);

    console.log(updateTxReceipt.transactionHash, 'root inserted');
    console.log(root);
    console.log(onchainRoot);

    // TODO: verify a user right here for correctness (check DB)
};

export default whitelist;
