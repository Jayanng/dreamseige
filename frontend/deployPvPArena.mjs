import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';

const chain = {
  id: 50312,
  name: 'Somnia Shannon Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: { default: { http: ['https://dream-rpc.somnia.network'] } }
};

const account = privateKeyToAccount('0x630686ba746fbcb4d99886e39fa576ee3cd87c9df3ac96ff3491732e66bca4f0');
const walletClient = createWalletClient({ account, chain, transport: http() });
const publicClient = createPublicClient({ chain, transport: http() });

const artifactStr = fs.readFileSync('../contracts/out/PvPArena.sol/PvPArena.json', 'utf8');
const artifact = JSON.parse(artifactStr);
const abi = artifact.abi;
const bytecode = artifact.bytecode.object;

async function deploy() {
  console.log('Deploying PvPArena...');
  try {
    const hash = await walletClient.deployContract({
      abi,
      bytecode,
      gas: 10000000n,
      type: 'legacy'
    });
    console.log('Tx hash:', hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('Deployed at:', receipt.contractAddress);
  } catch (e) {
    console.error('Deployment Failed:', e);
  }
}

deploy();
