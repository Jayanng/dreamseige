import { createWalletClient, createPublicClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const chain = {
  id: 50312,
  name: 'Somnia Shannon Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: { default: { http: ['https://dream-rpc.somnia.network'] } }
};

const account = privateKeyToAccount('0x630686ba746fbcb4d99886e39fa576ee3cd87c9df3ac96ff3491732e66bca4f0');
const walletClient = createWalletClient({ account, chain, transport: http() });
const publicClient = createPublicClient({ chain, transport: http() });

const addresses = {
  Base: '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66',
  Vault: '0x714256500e5b48836b823DF82c5F4CC2A8E88B55',
  Arena: '0x9d8d35a78b5972e2aae9b427e0e268ee2332952a',
  Leaderboard: '0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b',
  Registry: '0x1d617cC33411562c0c25Ce35A1B6F08E92d74916',
  Rewards: '0x9e05bB09A8ffE776585E61d5378cCd89DdA239d5'
};

const arenaAbi = [
  { name: 'setBaseContract', type: 'function', inputs: [{ type: 'address' }] },
  { name: 'setLeaderboard', type: 'function', inputs: [{ type: 'address' }] },
  { name: 'setResourceVault', type: 'function', inputs: [{ type: 'address' }] },
  { name: 'setEmpireRegistry', type: 'function', inputs: [{ type: 'address' }] }
];
const baseAbi = [{ name: 'setAttackContract', type: 'function', inputs: [{ type: 'address' }] }];
const commonAbi = [{ name: 'setPvPArena', type: 'function', inputs: [{ type: 'address' }] }];

async function executeTx(to, data, name) {
  console.log(`Executing ${name}...`);
  const hash = await walletClient.sendTransaction({
    to,
    data,
    account,
    type: 'legacy'
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✅ ${name} confirmed: ${hash}`);
}

async function main() {
  try {
    await executeTx(addresses.Arena, encodeFunctionData({ abi: arenaAbi, functionName: 'setBaseContract', args: [addresses.Base] }), 'Arena.setBaseContract');
    await executeTx(addresses.Arena, encodeFunctionData({ abi: arenaAbi, functionName: 'setLeaderboard', args: [addresses.Leaderboard] }), 'Arena.setLeaderboard');
    await executeTx(addresses.Arena, encodeFunctionData({ abi: arenaAbi, functionName: 'setResourceVault', args: [addresses.Vault] }), 'Arena.setResourceVault');
    await executeTx(addresses.Arena, encodeFunctionData({ abi: arenaAbi, functionName: 'setEmpireRegistry', args: [addresses.Registry] }), 'Arena.setEmpireRegistry');

    await executeTx(addresses.Base, encodeFunctionData({ abi: baseAbi, functionName: 'setAttackContract', args: [addresses.Arena] }), 'Base.setAttackContract');
    await executeTx(addresses.Vault, encodeFunctionData({ abi: commonAbi, functionName: 'setPvPArena', args: [addresses.Arena] }), 'Vault.setPvPArena');
    await executeTx(addresses.Leaderboard, encodeFunctionData({ abi: commonAbi, functionName: 'setPvPArena', args: [addresses.Arena] }), 'Leaderboard.setPvPArena');
    
    console.log('🎉 All wiring complete!');
  } catch (err) {
    console.error('Failed:', err);
  }
}

main();
