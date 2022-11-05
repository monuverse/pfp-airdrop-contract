import fs from 'fs';

import { MAX_SUPPLY } from '../episode';

const artworks: Array<string> = [''];
const distr: Array<number> = [
    1, 77, 333, 500, 640, 777, 1000, 1250, 1423, 1777,
];

type Attribute = {
    traitType: string;
    value: string | number;
};

type Metadata = {
    image: string;
    externalUrl: string;
    description: string;
    name: string;
    attributes: Array<Attribute>;
    backgroundColor: string;
    animationUrl: string;
};

const Artworks: Array<Metadata> = [];

console.log('! About to generate ', MAX_SUPPLY, 'metadata files');

artworks.forEach((artwork: string, index: number) => {
    for (let i: number = distr[index]; i < distr[index + 1]; i++) {
        fs.writeFile(`#${i}.json`, 'Hello content!', function (err) {
            if (err) throw err;
            console.log(`! metadata #${i} written`);
        });
    }
});

// - Tier 9: 1777/7777 (22.85%)
// - Tier 8: 1423/7777 (18.30%)
// - Tier 7: 1250/7777 (16.07%)
// - Tier 6: 1000/7777 (12.86%)
// - Tier 5: 777/7777 (9.99%)
// - Tier 4: 640/7777 (8.23%)
// - Tier 3: 500/7777 (6.43%)
// - Tier 2: 333/7777 (4.28%)
// - Tier 1: 77/7777 (0.99%)

// 77
// 255
// 511
// 777
// 1023
// 1279
// 1777
// 2078

// const cumulativeDistr: Array<number> = [
//     77, 410, 910, 1550, 2327, 3327, 4577, 6000, 7777,
// ];

// {
// 	"image": "",
// 	"external_url": "https://www.monuverse.xyz/",
// 	"description": "*“Let it flow”* said the sage, *“As sometimes all we need to do is to let the current lead us right where we need to be — a special place often hidden to our own eyes”*.",
// 	"name": "Winter Gate",
// 	"attributes": [
// 	{
// 		"trait_type": "Winter ",
// 		"value": "Starfish"
// 	},
// 	{
// 		"trait_type": "Essence",
// 		"value": 7777 - #id
// 	}],
// 	"background_color": "000000",
// 	"animation_url": ""
// }
