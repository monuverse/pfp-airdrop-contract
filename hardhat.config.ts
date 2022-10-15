import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

import * as dotenv from 'dotenv';

// Tasks
import './tasks/deploy';

dotenv.config();

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.16',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000,
            },
        },
    },

    mocha: {
        timeout: 100000,
    },

    paths: {
        sources: './contracts',
        tests: './test',
        cache: './cache',
        artifacts: './artifacts',
    },

    networks: {
        hardhat: {
            accounts: {
                mnemonic:
                    'monu verse arch peace light big bang builders chosen reveal scalable random',
                initialIndex: 0,
                count: 1001,
                path: "m/44'/60'/0'/0",
                accountsBalance: '10000000000000000000000',
                passphrase: '',
            },
        },

        goerli: {
            url: process.env.DEV_GOERLI_RPC || '',
            accounts: process.env.DEV_EOA_PRIV
                ? [process.env.DEV_EOA_PRIV]
                : [],
            gasPrice: 10000000000,
        },

        rinkeby: {
            url: process.env.DEV_RINK_RPC || '',
            accounts: process.env.DEV_EOA_PRIV
                ? [process.env.DEV_EOA_PRIV]
                : [],
            gasPrice: 5000000000,
        },

        // ethereum: {},
    },

    etherscan: {
        apiKey: {
            goerli: process.env.ETHERSCAN_API_KEY
                ? process.env.ETHERSCAN_API_KEY
                : '',
            rinkeby: process.env.ETHERSCAN_API_KEY
                ? process.env.ETHERSCAN_API_KEY
                : '',
        },
    },

    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: 'USD',
    },
};

export default config;
