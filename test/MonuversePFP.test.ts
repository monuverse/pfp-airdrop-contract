import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer, BigNumber } from "ethers";

describe("MonuversePFP", function () {
    const veilURI = "https://example.com/veil/";
    const baseURI = "https://example.com/base/";

    let deployer: Signer;
    let attacker: Signer;

    let monuversePFP: Contract;
    const maxSupply: number = 10;

    // Chainlink VRF V2
    const vrfSubscriptionId: number = 1;
    const vrfGaslane: Buffer = Buffer.from(
        'd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
        'hex'
    );
    let vrfCoordinatorV2Mock: Contract;

    before(async function () {
        [deployer, attacker] = await ethers.getSigners();

        const VRFCoordinatorV2Mock = await ethers.getContractFactory(
            'VRFCoordinatorV2Mock'
        );
        vrfCoordinatorV2Mock = await VRFCoordinatorV2Mock.deploy(0, 0);
        await vrfCoordinatorV2Mock.deployed();
        await vrfCoordinatorV2Mock.createSubscription();
        await vrfCoordinatorV2Mock.fundSubscription(
            vrfSubscriptionId,
            ethers.utils.parseEther('5')
        );

        monuversePFP = await ethers.getContractFactory("MonuversePFP")
            .then(async factory => factory.deploy(
                maxSupply, // maxSupply
                "MonuversePFP",
                "MVP",
                veilURI,
                baseURI,
                vrfCoordinatorV2Mock.address,
                vrfGaslane,
                vrfSubscriptionId,
            ));

        await monuversePFP.updateVRFParams({
            gasLane: vrfGaslane,
            subscriptionId: vrfSubscriptionId,
            requestConfirmations: 3,
            callbackGasLimit: 600000,
        });

        await vrfCoordinatorV2Mock.addConsumer(
            vrfSubscriptionId,
            monuversePFP.address
        );
    });

    describe("airdrop", function () {
        it("MUST allow token airdrop ONLY until supply is reached", async function () {
            await monuversePFP.airdrop(await deployer.getAddress(), 5);
            expect(await monuversePFP.totalSupply()).to.equal(5);

            await monuversePFP.airdrop(await attacker.getAddress(), 5);
            expect(await monuversePFP.totalSupply()).to.equal(maxSupply);

            await expect(monuversePFP.airdrop(await deployer.getAddress(), 1)).to.be.revertedWith("MonuversePFP: exceeding supply");
        });

        it('MUST allow requesting reveal seed', async () => {
            const requestId: BigNumber = BigNumber.from(1);

            await expect(monuversePFP.reveal())
                .to.emit(monuversePFP, 'RandomnessRequested')
                .withArgs(requestId)
                .and.to.emit(
                    vrfCoordinatorV2Mock,
                    'RandomWordsRequested'
                );
        });

        it('MUST NOT allow another reveal request if seed is fulfilling', async () => {
            await expect(
                monuversePFP.reveal()
            ).to.be.revertedWith(
                'MonuversePFP: currently fulfilling'
            );
        });

        it('MUST receive random seed successfully', async () => {
            const requestId: BigNumber = BigNumber.from(1);

            await expect(
                vrfCoordinatorV2Mock.fulfillRandomWords(
                    requestId,
                    monuversePFP.address
                )
            )
                .to.emit(
                    vrfCoordinatorV2Mock,
                    'RandomWordsFulfilled'
                );
        });

        it("MUST NOT allow airdropping tokens after reveal", async function () {
            await expect(monuversePFP.airdrop(await deployer.getAddress(), 1)).to.be.revertedWith("MonuversePFP: already revealed");
        });

        it('MUST show each token as revealed PFP', async () => {
            const totalSupply: number =
                await monuversePFP.totalSupply();

            console.log(totalSupply.toString())

            let mappedMetadataIds: Set<number> =
                new Set<number>();

            for (let i: number = 0; i < totalSupply; i++) {
                const tokenURI: string =
                    await monuversePFP.tokenURI(i);

                console.log(tokenURI);  

                expect(tokenURI.startsWith(baseURI)).to.be.true;
                expect(tokenURI.length).to.be.greaterThan(
                    baseURI.length
                );

                const mappedMetadataId: number = Number(
                    tokenURI.slice(baseURI.length)
                );

                expect(mappedMetadataId).to.not.be.NaN;
                expect(mappedMetadataId).to.not.be.undefined;
                expect(mappedMetadataIds.has(mappedMetadataId))
                    .to.be.false;

                mappedMetadataIds.add(mappedMetadataId);
            }

            expect(Math.min(...mappedMetadataIds)).to.equal(0);
            expect(Math.max(...mappedMetadataIds)).to.equal(totalSupply - 1);
        });
    });



    // describe("reveal", function () {
    //     it("should request a random word", async function () {
    //         await monuversePFP.reveal();
    //         expect(await vrfCoordinatorV2Mock.fulfilling()).to.be.true;
    //     });

    //     it("should not allow revealing twice", async function () {
    //         await monuversePFP.reveal();
    //         await expect(monuversePFP.reveal()).to.be.revertedWith("MonuversePFP: already revealed");
    //     });
    // });

    // describe("minting", function () {
    //     beforeEach(async function () {
    //         await monuversePFP.airdrop(await deployer.getAddress(), maxSupply);
    //         await monuversePFP.reveal();
    //     });

    //     it("should allow minting before reveal", async function () {
    //         await monuversePFP.airdrop(await attacker.getAddress(), 1);
    //         expect(await monuversePFP.totalSupply()).to.equal(11);
    //     });

    //     it("should not allow minting after reveal", async function () {
    //         await expect(monuversePFP.airdrop(await attacker.getAddress(), 1)).to.be.revertedWith("MonuversePFP: already revealed");
    //     });
    // });
});
