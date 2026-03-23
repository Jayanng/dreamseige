import { http, createConfig } from 'wagmi'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'
import { injected } from 'wagmi/connectors'

export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Shannon Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
    public:  { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: {
      name: 'Shannon Explorer',
      url: 'https://shannon-explorer.somnia.network',
    },
  },
  testnet: true,
})

export const config = getDefaultConfig({
  appName: 'DreamSiege',
  projectId: 'YOUR_PROJECT_ID', 
  chains: [somniaTestnet],
  transports: {
    [somniaTestnet.id]: http('https://dream-rpc.somnia.network', {
      fetchOptions: {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    }),
  },
  ssr: false,
})
