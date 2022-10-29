import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';

import { Chapter, Transition, MintGroupRules} from "../episode";

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