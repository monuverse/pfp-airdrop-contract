import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MintGroupRules, episode, branching } from '../episode';

async function write(address: string, hre: HardhatRuntimeEnvironment) {
    const ArchOfPeace = await hre.ethers.getContractFactory('ArchOfPeace');
    const archOfPeace = await ArchOfPeace.attach(address);

    console.log('Writing Chapters...');
    for (let i: number = 0; i < episode.length; i++) {
        const chapterTx = await archOfPeace.writeChapter(
            episode[i].label,
            episode[i].whitelisting,
            episode[i].minting.limit,
            hre.ethers.utils.parseUnits(
                episode[i].minting.price.toString(),
                'ether'
            ),
            episode[i].minting.isOpen,
            episode[i].revealing,
            episode[i].isConclusion
        );

        await chapterTx.wait();
        console.log(chapterTx.transactionHash, 'tx for', episode[i].label);

        const rules: Array<MintGroupRules> = episode[i].minting.rules;
        for (let r: number = 0; r < rules.length; r++) {
            const ruleTx = await archOfPeace.writeMintGroup(
                episode[i].label,
                rules[r].label,
                {
                    enabled: rules[r].enabled,
                    fixedPrice: rules[r].fixedPrice,
                }
            );

            await ruleTx.wait();
            console.log(
                '\t',
                ruleTx.transactionHash,
                'tx for',
                episode[i].label,
                'rule'
            );
        }
    }

    console.log('Writing Branching...');
    for (let i: number = 0; i < branching.length; i++) {
        const transitionTx = await archOfPeace.writeTransition(
            branching[i].from,
            branching[i].to,
            branching[i].event
        );

        await transitionTx.wait();

        console.log(transitionTx.transactionHash, 'tx for transition', i);
    }
}

export default write;
