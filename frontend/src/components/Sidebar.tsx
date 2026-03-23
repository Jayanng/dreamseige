import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAccount, useReadContract, useBlockNumber } from 'wagmi';
import { useAccountModal } from '@rainbow-me/rainbowkit';
import { CONTRACT_ADDRESSES, EMPIRE_REGISTRY_ABI } from '../constants/contracts';

export default function Sidebar() {
  const { address, isConnected } = useAccount();
  const { openAccountModal } = useAccountModal();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const { data: empire } = useReadContract({
    address: CONTRACT_ADDRESSES.EMPIRE_REGISTRY,
    abi: EMPIRE_REGISTRY_ABI,
    functionName: 'getEmpire',
    args: [address!],
    query: { enabled: !!address }
  }) as any;

  return (
    <aside className="hidden md:flex w-[240px] flex-shrink-0 flex-col border-r border-[#2A2A45] bg-[#080810] h-full z-30">
      <div className="p-6">
        <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="size-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(123,63,228,0.4)]">
            <span className="material-symbols-outlined text-2xl">castle</span>
          </div>
          <div>
            <h1 className="font-fantasy text-lg leading-tight tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-primary/60 uppercase">DREAMSIEGE</h1>
          </div>
        </NavLink>
      </div>
      
      <nav className="flex-1 px-3 space-y-1">
        <NavLink to="/empire" className={({ isActive }) => 
          `w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/20 border border-primary/40 text-primary-light' : 'text-[#6B68A0] hover:bg-white/5 hover:text-[#A09DC0]'}`
        }>
          <span className="material-symbols-outlined">castle</span>
          <span className="text-sm font-medium">My Empire</span>
        </NavLink>
        <NavLink to="/siege" className={({ isActive }) => 
          `w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/20 border border-primary/40 text-primary-light' : 'text-[#6B68A0] hover:bg-white/5 hover:text-[#A09DC0]'}`
        }>
          <span className="material-symbols-outlined">swords</span>
          <span className="text-sm font-medium">Siege Chamber</span>
        </NavLink>
        <NavLink to="/legends" className={({ isActive }) => 
          `w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/20 border border-primary/40 text-primary-light' : 'text-[#6B68A0] hover:bg-white/5 hover:text-[#A09DC0]'}`
        }>
          <span className="material-symbols-outlined">emoji_events</span>
          <span className="text-sm font-medium">Hall of Legends</span>
        </NavLink>
        <NavLink to="/battlelog" className={({ isActive }) => 
          `w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${isActive ? 'bg-primary/20 border border-primary/40 text-primary-light' : 'text-[#6B68A0] hover:bg-white/5 hover:text-[#A09DC0]'}`
        }>
          <span className="material-symbols-outlined">history_edu</span>
          <span className="text-sm font-medium">Battle Log</span>
        </NavLink>
      </nav>

      <div className="p-4 space-y-4 border-t border-[#2A2A45] bg-black/20">
        {empire?.exists && (
          <div className="flex items-center gap-2 px-2 mb-1">
            <span className="text-lg">{empire.badge}</span>
            <span className="font-fantasy text-sm text-[#C084FC] truncate">{empire.name}</span>
          </div>
        )}
        <button 
          onClick={() => openAccountModal?.()}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-all text-left group"
        >
          <span className="material-symbols-outlined text-[#6B68A0] text-xl group-hover:text-primary transition-colors">account_balance_wallet</span>
          <span className="font-mono text-[12px] text-[#A09DC0] group-hover:text-white transition-colors">
            {isConnected && address ? formatAddress(address) : 'No Wallet'}
          </span>
        </button>
        <div className="px-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 tracking-wider uppercase">
            SOMNIA TESTNET
          </span>
        </div>
        <div className="flex items-center gap-2 px-2">
          <span className="h-2 w-2 rounded-full bg-accent-teal shadow-[0_0_8px_rgba(0,245,212,0.8)] animate-pulse"></span>
          <span className="font-mono text-[11px] text-[#A09DC0] uppercase tracking-wider">
            LIVE · Block <span className="text-accent-teal">#{blockNumber ? Number(blockNumber).toLocaleString() : '...'}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
