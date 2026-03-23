import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import '@rainbow-me/rainbowkit/styles.css'

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { config, somniaTestnet } from './wagmi.config'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { GameProvider } from './context/GameContext'

const queryClient = new QueryClient()

if (typeof window !== 'undefined' && (window as any).ethereum) {
  console.log('[Main] Ethereum provider detected:', (window as any).ethereum);
}

console.log("[Main] Mounting React root...");
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#9647FE',
          accentColorForeground: 'white',
          borderRadius: 'medium',
        })}>
          <BrowserRouter>
            <GameProvider>
              <App />
            </GameProvider>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
