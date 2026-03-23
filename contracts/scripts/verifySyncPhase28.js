const { createPublicClient, http } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const rpcUrl = 'https://dream-rpc.somnia.network';
const publicClient = createPublicClient({ transport: http(rpcUrl) });

const TARGET_VAULT = '0x69720c73a855996a32ed590e64536c77095d2f77';
const BASE_CONTRACT = '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66';
const PVP_ARENA = '0x67097c8e6be1f1bd8b8094353ac4e7b8cd137b01';

const abi = [
    { name: "resourceVault", type: "function", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }
];

async function check() {
    console.log('--- RESOURCE SYNC AUDIT: PHASE 28 ---');
    console.log(`Target Vault: ${TARGET_VAULT}\n`);

    async function verify(name, addr) {
        try {
            const actual = await publicClient.readContract({
                address: addr,
                abi: abi,
                functionName: 'resourceVault'
            });
            const matches = actual.toLowerCase() === TARGET_VAULT.toLowerCase();
            console.log(`[${matches ? 'MATCH' : 'MISMATCH'}] ${name}: got ${actual}`);
        } catch (e) {
            console.log(`[ERROR] ${name}: ${e.message}`);
        }
    }

    await verify('BaseContract', BASE_CONTRACT);
    await verify('PvPArena', PVP_ARENA);

    console.log('\n--- SETTER AUDIT ---');
    console.log('BaseContract functional setter: setResourceVault(address)');
}

check();
