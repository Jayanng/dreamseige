const fs = require('fs');
const { execSync } = require('child_process');

try {
  console.log('Reading compiled artifact...');
  const artifactStr = fs.readFileSync('out/PvPArena.sol/PvPArena.json', 'utf8');
  const artifact = JSON.parse(artifactStr);
  const bytecode = artifact.bytecode.object;
  if (!bytecode || bytecode === '0x') {
    throw new Error('Bytecode not found in artifact');
  }
  console.log(`Bytecode length: ${bytecode.length}. Deploying via cast send...`);
  const pk = '0x630686ba746fbcb4d99886e39fa576ee3cd87c9df3ac96ff3491732e66bca4f0';
  const cmd = `C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\contracts\\foundry_bin\\cast.exe send --create ${bytecode} --rpc-url https://dream-rpc.somnia.network --private-key ${pk} --legacy`;
  const output = execSync(cmd, { encoding: 'utf8' });
  console.log(output);
} catch (e) {
  console.error(e);
}
