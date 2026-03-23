const fs = require('fs');
const path = require('path');

// Manually resolve viem from frontend/node_modules
const frontendNodeModules = path.resolve(__dirname, '../../frontend/node_modules');
const viemPath = path.join(frontendNodeModules, 'viem');

if (!fs.existsSync(viemPath)) {
    console.error(`Viem not found at ${viemPath}`);
    process.exit(1);
}

// Manually load .env
function loadEnv() {
    try {
        const env = fs.readFileSync('.env', 'utf8');
        env.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const v = parts.slice(1).join('=').trim();
                process.env[key] = v;
            }
        });
    } catch (e) {
        console.error('No .env file found');
    }
}
loadEnv();

const { createWalletClient, http, publicActions } = require(path.join(viemPath, '_cjs', 'index.js'));
const { privateKeyToAccount } = require(path.join(viemPath, '_cjs', 'accounts', 'index.js'));

const rpcUrl = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
const pk = process.env.DEPLOYER_PRIVATE_KEY;

if (!pk) {
    console.error('DEPLOYER_PRIVATE_KEY is missing');
    process.exit(1);
}

const account = privateKeyToAccount(pk);

const client = createWalletClient({
    account,
    transport: http(rpcUrl),
}).extend(publicActions);

async function deploy() {
    try {
        console.log('🚀 Phase 11: Programmatic Deployment (Viem Link)...');
        const artifact = JSON.parse(fs.readFileSync('out/PvPArena.sol/PvPArena.json', 'utf8'));
        const bytecode = artifact.bytecode.object;
        const abi = artifact.abi;

        console.log(`Bytecode length: ${bytecode.length}. Broadcasting...`);

        const hash = await client.deployContract({
            abi,
            bytecode: bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`,
            gas: 5_000_000n, // High gas for safety
        });

        console.log(`Transaction Hash: ${hash}`);
        console.log('Waiting for confirmation...');

        const receipt = await client.waitForTransactionReceipt({ hash });
        console.log(`\n✅ SUCCESS! PvPArena deployed at: ${receipt.contractAddress}\n`);
        
        fs.writeFileSync('last_arena_deploy.txt', receipt.contractAddress);
    } catch (e) {
        console.error('❌ Deployment Failed:', e);
        process.exit(1);
    }
}

deploy();
