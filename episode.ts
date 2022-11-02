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

export const MAX_SUPPLY: number = 111;

export const MAX_MINTABLE: number = 3;

export const MAP: Map<string, string> = new Map([
    [
        'Introduction: The Big Bang',
        '0xf7557b1a7545ca9a1730dba009cddef7e4c1b08a16a141bb5664bbb7b76d5861',
    ],
    [
        'Chapter I: The Arch Builders',
        '0x9c73a005c8a24c96d44198313e479234c6b601b1f309e4a18c5c0a3a38150c66',
    ],
    [
        'Chapter II: The Chosen Ones',
        '0x4a4c10af8de97324f726ee2cbf52ae641d18201ac5f0f77ec4e239388d49e000',
    ],
    [
        'Chapter III: The Believers`,',
        '0x82bea18981b7635dcb02e5247be6b2b5e462b7ba93db3e773aa5806c629d59d6',
    ],
    [
        'Chapter IV: The Brave`,',
        '0xc6678872f9ee2e09dd78a828f66de1015f7d3970fb6a174552bed5fa699a5daa',
    ],
    [
        'Chapter V: The Wild Age',
        '0x3f00e274290a798371e2b3cb18bf8ebd40d00e96c70a18f114ab9d6f96915306',
    ],
    [
        'Chapter VI: The Great Reveal',
        '0xb3de280950b0f33f29c3849cf05df3f24dea40eeefef943c63e498ee39c0ee77',
    ],
    [
        'Conclusion: Monuverse',
        '0x4303db6358dfe701468de46530e7892495a757cc9fe8c0c161116799c2a99e40',
    ],
]);

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
