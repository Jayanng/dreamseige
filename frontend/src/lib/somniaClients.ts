import { createPublicClient, webSocket, http, defineChain } from "viem";
import { SDK as ReactivitySDK } from "@somnia-chain/reactivity";
import { SDK as StreamsSDK } from "@somnia-chain/streams";

export const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { 
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["wss://dream-rpc.somnia.network/ws"]
    },
    public:  { 
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["wss://dream-rpc.somnia.network/ws"]
    },
  },
  testnet: true,
});

console.log("[SomniaClients] Evaluating somniaClients.ts. Chain URL:", somniaTestnet.rpcUrls.default.http[0]);

const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http("https://dream-rpc.somnia.network"),
});

const reactivityPublicClient = createPublicClient({
  chain: somniaTestnet,
  transport: webSocket("wss://dream-rpc.somnia.network/ws"),
});

console.log("[SomniaClients] Clients created. Reactivity chain:", reactivityPublicClient.chain?.name);

export const reactivityClient = new ReactivitySDK({ 
  public: reactivityPublicClient,
});
export const streamsClient = new StreamsSDK({ 
  public: publicClient,
});
export { publicClient };
