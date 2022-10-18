import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

export type MintGroupRules = {
    label: string;
    enabled: boolean;
    fixedPrice: boolean;
};

export type Minting = {
    limit: number;
    price: number;
    rules: Array<MintGroupRules>;
    isOpen: boolean;
};

export type Chapter = {
    label: string;
    minting: Minting;
    whitelisting: boolean;
    revealing: boolean;
    isConclusion: boolean;
};

export type Transition = {
    from: string;
    event: string;
    to: string;
};

export type WhitelistRecord = {
    account: SignerWithAddress;
    limit: number;
    chapter: Buffer;
};

export const writeEpisode = async (
    episodeContract: Contract,
    episode: Array<Chapter>,
    branching: Array<Transition>
) => {
    for (let i: number = 0; i < episode.length; i++) {
        await expect(
            episodeContract.writeChapter(
                episode[i].label,
                episode[i].whitelisting,
                episode[i].minting.limit,
                ethers.utils.parseUnits(
                    episode[i].minting.price.toString(),
                    'ether'
                ),
                episode[i].minting.isOpen,
                episode[i].revealing,
                episode[i].isConclusion
            )
        )
            .to.emit(episodeContract, 'ChapterWritten')
            .withArgs(
                episode[i].label,
                episode[i].whitelisting,
                episode[i].minting.limit,
                ethers.utils.parseUnits(
                    episode[i].minting.price.toString(),
                    'ether'
                ),
                episode[i].minting.isOpen,
                episode[i].revealing,
                episode[i].isConclusion
            );
    }

    for (let e: number = 0; e < episode.length; e++) {
        const rules: Array<MintGroupRules> = episode[e].minting.rules;

        for (let r: number = 0; r < rules.length; r++) {
            await expect(
                episodeContract.writeMintGroup(
                    episode[e].label,
                    rules[r].label,
                    {
                        enabled: rules[r].enabled,
                        fixedPrice: rules[r].fixedPrice,
                    }
                )
            )
                .to.emit(episodeContract, 'MintGroupWritten')
                .withArgs(
                    episode[e].label,
                    rules[r].label,
                    rules[r].fixedPrice
                );
        }
    }

    for (let i: number = 0; i < branching.length; i++) {
        await expect(
            episodeContract.writeTransition(
                branching[i].from,
                branching[i].to,
                branching[i].event
            )
        )
            .to.emit(episodeContract, 'TransitionWritten')
            .withArgs(branching[i].from, branching[i].to, branching[i].event);
    }
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
