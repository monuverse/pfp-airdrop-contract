import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
    TransactionReceipt,
    TransactionResponse,
} from '@ethersproject/providers';

const whitelist = async function (
    address: string,
    root: string,
    hre: HardhatRuntimeEnvironment
) {
    const ArchOfPeace = await hre.ethers.getContractFactory('ArchOfPeace');
    const archOfPeace = await ArchOfPeace.attach(address);

    const updateTx: TransactionResponse = await archOfPeace.setWhitelistRoot(
        root
    );
    const updateTxReceipt: TransactionReceipt = await updateTx.wait();
    const onchainRoot = (await archOfPeace.whitelistRoot()).slice(2);

    console.log('>', updateTxReceipt.transactionHash, 'tx hash root update');
    console.log('>', root, 'root');
    console.log('> ', onchainRoot, 'onchain root');
};

export default whitelist;
