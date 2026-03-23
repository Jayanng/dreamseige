const { createPublicClient, http, decodeErrorResult } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const rpcUrl = 'https://dream-rpc.somnia.network';
const publicClient = createPublicClient({ transport: http(rpcUrl) });

const BASE_CONTRACT = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66';
const WALLET_1 = '0x71708D8171F0Af75b0184861906B3678f7337E50';

const abi = [
    { name: "resourceVault", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
    { name: "attackContract", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
    { name: "collectResources", type: "function", inputs: [], outputs: [], stateMutability: "nonpayable" },
    { name: "hasBase", type: "function", inputs: [{ type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
    { type: "error", name: "AlreadyInitialized", inputs: [] },
    { type: "error", name: "NotInitialized", inputs: [] },
    { type: "error", name: "NotBaseOwner", inputs: [] },
    { type: "error", name: "InvalidSlot", inputs: [] },
    { type: "error", name: "SlotOccupied", inputs: [] },
    { type: "error", name: "SlotEmpty", inputs: [] },
    { type: "error", name: "UpgradeAlreadyInProgress", inputs: [] },
    { type: "error", name: "UpgradeNotComplete", inputs: [] },
    { type: "error", name: "InsufficientResources", inputs: [] },
    { type: "error", name: "MaxLevelReached", inputs: [] },
    { type: "error", name: "OnlyAttackContract", inputs: [] },
    { type: "error", name: "CooldownActive", inputs: [] }
];

async function debug() {
    console.log('--- DEBUG: collectResources() REVERT ---');
    console.log(`BaseContract:  ${BASE_CONTRACT}`);
    console.log(`From Wallet:   ${WALLET_1}\n`);

    // 1. Read State
    try {
        const vault = await publicClient.readContract({ address: BASE_CONTRACT, abi, functionName: 'resourceVault' });
        const attack = await publicClient.readContract({ address: BASE_CONTRACT, abi, functionName: 'attackContract' });
        const initialized = await publicClient.readContract({ address: BASE_CONTRACT, abi, functionName: 'hasBase', args: [WALLET_1] });

        console.log(`[STATE] resourceVault:  ${vault}`);
        console.log(`[STATE] attackContract: ${attack}`);
        console.log(`[STATE] hasBase:        ${initialized}\n`);

    } catch (e) {
        console.log(`[ERROR] Reading state: ${e.message}`);
    }

    // 2. Simulate
    console.log('Simulating collectResources()...');
    try {
        await publicClient.simulateContract({
            address: BASE_CONTRACT,
            abi,
            functionName: 'collectResources',
            account: WALLET_1
        });
        console.log('✅ Simulation SUCCESS? (Unexpected if it reverted on-chain)');
    } catch (e) {
        console.log('\n--- REVERT CAUGHT ---');
        
        if (e.data) {
            console.log(`Raw data: ${e.data}`);
            try {
                const decoded = decodeErrorResult({
                    abi,
                    data: e.data
                });
                console.log(`Decoded Error: ${decoded.errorName}`);
            } catch (decodeErr) {
                console.log(`Decoding Failed: ${decodeErr.message}`);
            }
        } else {
             // Some providers return error message directly in e.shortMessage or e.message
             console.log(`Error Message: ${e.shortMessage || e.message}`);
             
             // Check for custom error in message (viem often wraps it)
             const match = (e.shortMessage || e.message).match(/reverted with the following signature "([^"]+)"/);
             if (match) {
                 console.log(`Captured Signature: ${match[1]}`);
             }
        }
    }
}

debug();
