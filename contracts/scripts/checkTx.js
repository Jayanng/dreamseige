const path = require('path');
const { createPublicClient, http } = require('C:\\Users\\dell\\Documents\\VS_code\\dreamsiege\\frontend\\node_modules\\viem\\_cjs\\index.js');

const client = createPublicClient({
  transport: http('https://dream-rpc.somnia.network')
});

async function checkTx() {
  const hash = '0x479b51770971d30fbf23e09afcb4326ee72f93925484642cf08ae29fc6235a23';
  console.log(`Checking transaction status for ${hash}...`);
  try {
    const receipt = await client.getTransactionReceipt({ hash });
    console.log(`Status: ${receipt.status}`);
    console.log(`Gas Used: ${receipt.gasUsed}`);
    console.log(`Contract Address: ${receipt.contractAddress}`);
  } catch (e) {
    console.error(e);
  }
}

checkTx();
