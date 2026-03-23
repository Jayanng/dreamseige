import { useEffect, useRef } from 'react';
import { useCollectResources } from '../hooks/useGame';
import { useGame } from '../context/GameContext';
import ResourceDisplay from './ResourceDisplay';

export default function Header() {
  const { collectResources, isPending: collectPending, isSuccess: collectConfirmed, txHash } = useCollectResources();
  const { refreshEmpireState } = useGame();
  const processedHash = useRef<string | null>(null);

  useEffect(() => {
    if (collectConfirmed && txHash && processedHash.current !== txHash) {
      processedHash.current = txHash;
      // Refetch the on-chain data immediately
      refreshEmpireState();
    }
  }, [collectConfirmed, txHash, refreshEmpireState]);

  const isLoading = collectPending;

  return (
    <header className="h-16 border-b border-[#2A2A45] flex items-center justify-between px-4 md:px-8 bg-[#0F0F1E] backdrop-blur-sm z-20 shadow-[0_1px_0_rgba(155,93,229,0.3)]">
      <div className="flex items-center w-full gap-2 md:gap-6 overflow-x-auto no-scrollbar py-1">
        <ResourceDisplay />
        
        <div className="flex-1 flex justify-end gap-2 shrink-0">
          <button 
            disabled={isLoading}
            onClick={() => collectResources()}
            className={`flex items-center gap-2 px-3 md:px-5 h-10 rounded-lg border border-[#2A2A45] bg-[#0F0F1E] text-[#A09DC0] hover:text-accent-teal hover:border-accent-teal hover:shadow-[0_0_12px_rgba(0,245,212,0.2)] transition-all text-[10px] md:text-xs font-medium tracking-wide ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className={`material-symbols-outlined text-xs ${isLoading ? 'animate-spin' : ''}`}>
              {isLoading ? 'progress_activity' : 'timer'}
            </span>
            <span className="hidden sm:inline">{isLoading ? 'Collecting...' : 'Collect Resources'}</span>
            <span className="sm:hidden">{isLoading ? '...' : 'Collect'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
