import { ethers } from "hardhat";
import { expect } from "chai";
import EthCrypto from "eth-crypto";

/**
 * Start a local hardhat node using this command: npx hardhat node
 * Open another terminal and use this command to launch these tests: REPORT_GAS=true npx hardhat test test/Marketplace.ts 
 */
describe('usage of marketplace', () => {
    async function deployContract() {
        const Marketplace = await ethers.getContractFactory("Marketplace");
        const marketplace = await Marketplace.deploy();
        await marketplace.deployed();
        return marketplace;
    }
    /**
     * This function will be different when we'll use the microservice. There will be a check on the selected dates, if 
     * the item is available in those dates then this function will generate a valid hash
     * @param messageToSign 
     * @returns 
     */
    async function generateHashAndSignature(messageToSign: string) {
        const privateKeyOwner = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
        const privateKeyOfWrongAccount = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

        const messageHashed = EthCrypto.hash.keccak256(messageToSign);
        const signature = EthCrypto.sign(privateKeyOwner, messageHashed);
        const wrongSignature = EthCrypto.sign(privateKeyOfWrongAccount, messageHashed);
        return {
            hash: messageHashed,
            signature: signature,
            wrongSignature: wrongSignature
        }
    }
    describe('deployment', () => {
        it('should call the owner of the marketplace', async () => {
            const accounts = await ethers.getSigners();
            const marketplace = await deployContract();

            expect(await marketplace.getOwner()).to.equal(accounts[0].address);
            expect(await marketplace.getNumberOfItems()).to.equal(0);
        })
    });
    describe('preorder an item', () => {
        it('should deploy the contract, create a valid signature and test if it was signed by the owner of the contract', async () => {
            const marketplace = await deployContract();
            const messageToSign = 'viva la vida';
            const owner = (await ethers.getSigners())[0];
            const notOwner = (await ethers.getSigners())[1];

            const { hash, signature } = await generateHashAndSignature(messageToSign);

            expect(await marketplace.verifySignature(hash, signature)).to.equal(owner.address);
            expect(await marketplace.verifySignature(hash, signature)).to.not.equal(notOwner.address);

        })
        it('should preorder an item no more than once', async () => {
            const marketplace = await deployContract();
            const messageToSign = 'mylo xyloto';
            const startDate = Math.floor((new Date()).getTime() / 100);
            const endDate = Math.floor((new Date()).getTime() / 100 + 200000);
            const idOfItemToPreorder = 0;

            const { hash, signature } = await generateHashAndSignature(messageToSign);
            expect(await marketplace.isHashAlreadyUser(hash)).to.equal(false);
            expect((await marketplace.getNumberOfItems()).toNumber()).to.equal(0);
            await marketplace.preorderItem(
                idOfItemToPreorder,
                startDate,
                endDate,
                hash,
                signature
            );

            expect((await marketplace.getItem(idOfItemToPreorder))[0].toNumber()).to.equal(0); //we get the [0] because the contract returns a struct
            expect(await marketplace.isHashAlreadyUser(hash)).to.equal(true);
            expect((await marketplace.getNumberOfItems()).toNumber()).to.equal(1);

            await expect(marketplace.preorderItem(
                idOfItemToPreorder,
                startDate,
                endDate,
                hash,
                signature
            )).to.be.revertedWith(
                'This hash was already used'
            );
        })

    });
    describe('revert caused by the wrong signer', () => {
        it('should revert because the message was not signed by the owner', async () => {
            const marketplace = await deployContract();
            const message = 'life in technicolor';
            const startDate = Math.floor((new Date()).getTime() / 100);
            const endDate = Math.floor((new Date()).getTime() / 100 + 200000);
            const idOfItemToPreorder = 0;
            const { hash, signature, wrongSignature } = await generateHashAndSignature(message);
            await expect(marketplace.preorderItem(
                idOfItemToPreorder,
                startDate,
                endDate,
                hash,
                wrongSignature
            )).to.be.revertedWith(
                'This signature is invalid, signer doesn\'t match the owner'
            );
        })
    })
})