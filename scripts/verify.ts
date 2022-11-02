import { ethers } from 'hardhat';

const verify = async function (
    address: string
) {
    const ArchOfPeace = await ethers.getContractFactory('ArchOfPeace');
    const archOfPeace = await ArchOfPeace.attach(address);

    const isWhitelisted: boolean = await archOfPeace[
        'isAccountWhitelisted(address,uint256,bytes32,bytes32[])'
    ](
        '0xFa111502D5f4B4902f14111fed8CFD910a356c1b',
        3,
        '0x9c73a005c8a24c96d44198313e479234c6b601b1f309e4a18c5c0a3a38150c66',
        [
            '0x53f515319d7d620f6da500f5327344c5a5b7f131ef640a023ed0623622bf81a2',
            '0xe3370229f81e57f0d67d698506a858c83f9ca2ec2e2111a64270f944728686a5',
            '0xd84a7022cf4cb91cebd29f3a9c4eea818e207c7563d493a0e10d514e7a745172',
            '0xee3f2f5a3fd6c14fe12af5e26d84aee67d653c1c782f236bd652b6dfdf46bcfc',
            '0x6447dcbda482104f4caff0442679386d26431520fe3c5dda3b463bc65ee904c1',
            '0xebf4ebabbdb6009bb64e012d46706e7e29e381ab078e8ea7d9945cba51c0a156',
            '0x78b4a2d40d9a898a3c3dfdefd41a76b12e63d759312be94ed95baed681d63a9f',
            '0x6b4afebb47cd89a1985c4dabc24f89fc93cc0949bce496634ae285957a1e2254',
            '0x5b178f3b779eb85fcde868f6a295a19cc84438aa58def99fad1b5180294c7800',
            '0x8cfc35b75ba8cdbca32f47fb8a873a6ad472eaf3d1a7095356606b2e9d1fced8',
        ]
    );

    console.log('! Account whitelisted:', isWhitelisted);
};

export default verify;
