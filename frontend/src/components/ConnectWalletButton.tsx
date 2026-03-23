import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSwitchChain } from 'wagmi';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

const ConnectWalletButton = () => {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  
  const SOMNIA_CHAIN_ID = 50312;

  const addSomniaToMetaMask = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${SOMNIA_CHAIN_ID.toString(16)}`,
            chainName: 'Somnia Shannon Testnet',
            nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
            rpcUrls: ['https://dream-rpc.somnia.network'],
            blockExplorers: ['https://shannon-explorer.somnia.network'],
          }],
        });
      }
    } catch (e) {
      console.error("Failed to add Somnia chain:", e);
    }
  };

  useEffect(() => {
    if (isConnected && chainId !== SOMNIA_CHAIN_ID) {
      addSomniaToMetaMask();
    }
  }, [isConnected, chainId]);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={openConnectModal}
                    className="bg-gradient-to-r from-primary to-accent hover:shadow-[0_0_20px_rgba(123,63,228,0.5)] text-white px-8 py-3 rounded-full text-xs font-black tracking-widest transition-all uppercase font-fantasy"
                  >
                    CONNECT WALLET
                  </motion.button>
                );
              }

              if (chain.unsupported || chain.id !== SOMNIA_CHAIN_ID) {
                return (
                  <button 
                    onClick={() => switchChain({ chainId: SOMNIA_CHAIN_ID })}
                    className="bg-accent text-white px-8 py-3 rounded-full text-xs font-black tracking-widest hover:bg-accent/80 transition-all uppercase font-fantasy"
                  >
                    Switch to Somnia
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-3">
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="btn-ghost-gradient px-6 py-2.5 rounded-full text-xs font-black tracking-widest text-white flex items-center gap-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-nebula-teal animate-pulse-teal" />
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default ConnectWalletButton;
