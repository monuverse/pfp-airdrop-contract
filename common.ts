import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

export type WhitelistRecord = {
    account: SignerWithAddress;
    limit: number;
    chapter: Buffer;
};

export const toWhitelistLeaf = (
    address: string,
    limit: number,
    chapter: Buffer
): Buffer => {
    return Buffer.from(
        ethers.utils
            .solidityKeccak256(
                ['address', 'uint256', 'bytes32'],
                [address, limit, chapter]
            )
            .slice(2),
        'hex'
    );
};

export const hashStr = (value: string) => {
    return ethers.utils.solidityKeccak256(['string'], [value]);
};

export const buffHashStr = (value: string) => {
    return Buffer.from(hashStr(value).slice(2), 'hex');
};

export const hashNum = (value: number) => {
    return ethers.utils.solidityKeccak256(['uint256'], [value]);
};
