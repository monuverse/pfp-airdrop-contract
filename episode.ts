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

export const MAX_SUPPLY: number = 111;

export const MAX_MINTABLE: number = 3;

export const episode: Array<Chapter> = [
    {
        label: 'Introduction: The Big Bang',
        whitelisting: true,
        minting: { limit: 0, price: 0, rules: [], isOpen: false },
        revealing: false,
        isConclusion: false,
    },
    {
        label: 'Chapter I: The Arch Builders',
        whitelisting: true,
        minting: { limit: 11, price: 0, rules: [], isOpen: false },
        revealing: false,
        isConclusion: false,
    },
    {
        label: 'Chapter II: The Chosen Ones',
        whitelisting: false,
        minting: {
            limit: MAX_SUPPLY,
            price: 0.09,
            rules: [
                {
                    label: 'Chapter I: The Arch Builders',
                    enabled: true,
                    fixedPrice: true,
                },
            ],
            isOpen: false,
        },
        revealing: false,
        isConclusion: false,
    },
    {
        label: 'Chapter III: The Believers',
        whitelisting: false,
        minting: {
            limit: MAX_SUPPLY,
            price: 0.09,
            rules: [
                {
                    label: 'Chapter I: The Arch Builders',
                    enabled: true,
                    fixedPrice: true,
                },
                {
                    label: 'Chapter II: The Chosen Ones',
                    enabled: true,
                    fixedPrice: false,
                },
            ],
            isOpen: false,
        },
        revealing: false,
        isConclusion: false,
    },
    {
        label: 'Chapter IV: The Brave',
        whitelisting: false,
        minting: {
            limit: MAX_SUPPLY,
            price: 0.11,
            rules: [
                {
                    label: 'Chapter I: The Arch Builders',
                    enabled: true,
                    fixedPrice: true,
                },
            ],
            isOpen: true,
        },
        revealing: false,
        isConclusion: false,
    },
    {
        label: 'Chapter V: The Wild Age',
        whitelisting: false,
        minting: { limit: 0, price: 0, rules: [], isOpen: false },
        revealing: false,
        isConclusion: false,
    },
    {
        label: 'Chapter VI: The Great Reveal',
        whitelisting: false,
        minting: { limit: 0, price: 0, rules: [], isOpen: false },
        revealing: true,
        isConclusion: false,
    },
    {
        label: 'Conclusion: Monuverse',
        whitelisting: false,
        minting: { limit: 0, price: 0, rules: [], isOpen: false },
        revealing: false,
        isConclusion: true,
    },
];

export const branching: Array<Transition> = [
    {
        from: 'Introduction: The Big Bang',
        event: 'EpisodeProgressedOnlife',
        to: 'Chapter I: The Arch Builders',
    },
    {
        from: 'Chapter I: The Arch Builders',
        event: 'EpisodeProgressedOnlife',
        to: 'Chapter II: The Chosen Ones',
    },
    {
        from: 'Chapter II: The Chosen Ones',
        event: 'EpisodeProgressedOnlife',
        to: 'Chapter III: The Believers',
    },
    {
        from: 'Chapter II: The Chosen Ones',
        event: 'EpisodeMinted',
        to: 'Chapter V: The Wild Age',
    },
    {
        from: 'Chapter III: The Believers',
        event: 'EpisodeProgressedOnlife',
        to: 'Chapter IV: The Brave',
    },
    {
        from: 'Chapter III: The Believers',
        event: 'EpisodeMinted',
        to: 'Chapter V: The Wild Age',
    },
    {
        from: 'Chapter IV: The Brave',
        event: 'MintingSealed',
        to: 'Chapter V: The Wild Age',
    },
    {
        from: 'Chapter IV: The Brave',
        event: 'EpisodeMinted',
        to: 'Chapter V: The Wild Age',
    },
    {
        from: 'Chapter V: The Wild Age',
        event: 'EpisodeProgressedOnlife',
        to: 'Chapter VI: The Great Reveal',
    },
    {
        from: 'Chapter VI: The Great Reveal',
        event: 'EpisodeRevealed',
        to: 'Conclusion: Monuverse',
    },
];