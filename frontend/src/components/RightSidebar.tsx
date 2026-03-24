import React from 'react';
import LiveEventFeed from './LiveEventFeed';
import { useGame } from '../context/GameContext';
import { useStartUpgrade } from '../hooks/useGame';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, RESOURCE_VAULT_ABI, LEADERBOARD_CONTRACT_ABI, BASE_CONTRACT_ABI } from '../constants/contracts';

const BUILDING_NAMES = {
  0: 'Empty Slot',
  1: 'Credits Forge',
  2: 'Biomass Farm',
  3: 'Minera Extractor',
  4: 'Vanguard Barracks',
  5: 'Defense Tower',
  6: 'Shield Wall',
  7: 'Void Gate',
  8: 'Citadel Base'
};

export default function RightSidebar() {
  const { buildings, base, resources, setBase, selectedBuilding, setSelectedBuilding, refreshEmpireState, addEvent } = useGame();
  const { startUpgrade, isPending: upgradePending, isSuccess: upgradeConfirmed } = useStartUpgrade();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [showUpgradeWarning, setShowUpgradeWarning] = React.useState(false);

  const { data: playerStats } = useReadContract({
    address: CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT as `0x${string}`,
    abi: LEADERBOARD_CONTRACT_ABI,
    functionName: 'getPlayerStats',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: baseData } = useReadContract({
    address: CONTRACT_ADDRESSES.BASE_CONTRACT as `0x${string}`,
    abi: BASE_CONTRACT_ABI,
    functionName: 'getBase',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const stats = (playerStats as any) || { wins: 0, losses: 0 };
  const totalBattles = stats.wins + stats.losses;
  const raidSuccess = totalBattles > 0
    ? Math.round((stats.wins / totalBattles) * 100)
    : 0;

  const defensePower = (baseData as any)?.defensePower || 0;
  const attackPower = (baseData as any)?.attackPower || 0;
  const maxPower = Math.max(defensePower + attackPower, 1);
  const baseDefense = Math.min(Math.round((defensePower / maxPower) * 100), 99);

  // Get current level from global buildings state for accuracy
  const currentBuilding = selectedBuilding ? buildings[selectedBuilding.slot] : null;
  const currentLevel = currentBuilding?.level || selectedBuilding?.level || 1;

  const getUpgradeCosts = (level: number) => {
    const next = level + 1;
    return {
      credits: 100 * next,
      biomass: 50 * next,
      minera: 50 * next
    };
  };

  // Watch for upgrade confirmation to refresh state
  React.useEffect(() => {
    if (upgradeConfirmed) {
      refreshEmpireState();
    }
  }, [upgradeConfirmed, refreshEmpireState]);

  // Clear warning when selected building changes
  React.useEffect(() => {
    setShowUpgradeWarning(false);
  }, [selectedBuilding]);

  // Clear warning when stored balance becomes sufficient
  React.useEffect(() => {
    if (!showUpgradeWarning || !resources || !selectedBuilding) return;
    const costs = getUpgradeCosts(currentLevel);
    const nowCovers =
      BigInt(resources.gold)  >= BigInt(costs.credits) &&
      BigInt(resources.wood)  >= BigInt(costs.biomass) &&
      BigInt(resources.stone) >= BigInt(costs.minera);
    if (nowCovers) setShowUpgradeWarning(false);
  }, [resources, showUpgradeWarning, currentLevel, selectedBuilding]);

  const handleUpgrade = async () => {
    if (!selectedBuilding || !address || !base || !resources) return;

    const costs = getUpgradeCosts(currentLevel);

    // Check requirements against Vault resources (Primary Economy)
    const hasEnough =
      BigInt(resources.gold) >= BigInt(costs.credits) &&
      BigInt(resources.wood) >= BigInt(costs.biomass) &&
      BigInt(resources.stone) >= BigInt(costs.minera);

    if (!hasEnough) {
      setShowUpgradeWarning(true);
      return;
    }
    setShowUpgradeWarning(false);

    try {
      await startUpgrade(selectedBuilding.slot);
      const name = BUILDING_NAMES[selectedBuilding.buildingType as keyof typeof BUILDING_NAMES];

      addEvent('upgrade', `Instant upgrade initiated for <span class="text-accent-teal">${name}</span> on slot ${selectedBuilding.slot}...`, 'medium');

      // OPTIMISTIC UI: Deduct resources locally immediately
      setBase(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          gold: BigInt(prev.gold) - BigInt(costs.credits),
          wood: BigInt(prev.wood) - BigInt(costs.biomass),
          stone: BigInt(prev.stone) - BigInt(costs.minera)
        };
      });

    } catch (error) {
      console.error('Upgrade failed:', error);
      addEvent('system', `❌ Upgrade failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'high');
    }
  };

  return (
    <aside className="hidden xl:flex w-80 border-l border-[#2A2A45] flex-col bg-[#0F0F1E]/50 overflow-y-auto custom-scrollbar transition-all z-30">
      
      {/* BUILD & UPGRADE */}
      <div className="flex flex-col border-b border-[#2A2A45]">
        <div className="p-4 bg-[#0F0F1E]">
          <h2 className="font-fantasy text-xs uppercase tracking-widest text-[#C084FC] flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">construction</span> Build &amp; Upgrade
          </h2>
        </div>
        <div className="p-4 space-y-3">
          {selectedBuilding ? (
            <div className="p-4 bg-[#9B5DE5]/5 border border-[#9B5DE5]/30 rounded-xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-[#9B5DE5] font-mono uppercase tracking-widest mb-1">Selected</p>
                  <p className="text-sm font-bold text-[#F0EEFF] uppercase">
                    {BUILDING_NAMES[selectedBuilding.buildingType as keyof typeof BUILDING_NAMES]}
                  </p>
                  <p className="text-[10px] text-[#5A5880] font-mono">
                    Level {currentLevel} · Slot {String.fromCharCode(65 + (selectedBuilding.slot % 5))}{Math.floor(selectedBuilding.slot / 5) + 1}
                  </p>
                </div>
                <div className="w-10 h-10 bg-[#080810] rounded-lg border border-[#2A2A45] flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-primary">upgrade</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#9B5DE5]/10">
                <p className="text-[9px] text-[#5A5880] font-mono uppercase tracking-widest">Upgrade Costs</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-mono text-[#FFD60A] bg-[#FFD60A]/10 px-2 py-0.5 rounded border border-[#FFD60A]/20">
                    {getUpgradeCosts(currentLevel).credits.toLocaleString()} Credits
                  </span>
                  <span className="text-[10px] font-mono text-[#00F5D4] bg-[#00F5D4]/10 px-2 py-0.5 rounded border border-[#00F5D4]/20">
                    {getUpgradeCosts(currentLevel).biomass.toLocaleString()} Biomass
                  </span>
                  <span className="text-[10px] font-mono text-[#C084FC] bg-[#C084FC]/10 px-2 py-0.5 rounded border border-[#C084FC]/20">
                    {getUpgradeCosts(currentLevel).minera.toLocaleString()} Minera
                  </span>
                </div>
              </div>

              {showUpgradeWarning && (
                <p className="text-[10px] font-mono text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg px-3 py-2">
                  ⚠️ Insufficient balance. Collect your pending resources first.
                </p>
              )}

              <button
                disabled={upgradePending}
                onClick={handleUpgrade}
                className="w-full py-2.5 rounded-xl bg-[#9B5DE5]/20 border border-[#9B5DE5]/40 text-[#C084FC] text-[11px] font-bold uppercase tracking-widest hover:bg-[#9B5DE5]/30 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {upgradePending ? 'UPGRADING...' : '⬆ Upgrade Structure'}
              </button>
            </div>
          ) : (
            <>
              <div className="p-3 bg-[#0F0F1E] border border-[#2A2A45] rounded-lg flex gap-3 group hover:border-primary transition-all cursor-pointer">
                <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#A09DC0]">fort</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#F0EEFF] uppercase tracking-tight">Main Citadel</p>
                  <p className="text-[10px] text-[#6B68A0] font-mono">Select a building to upgrade</p>
                </div>
              </div>

              <div className="p-3 bg-[#0F0F1E]/40 border border-dashed border-[#2A2A45] rounded-lg flex items-center justify-center gap-2 text-primary group hover:bg-[#0F0F1E] hover:border-primary transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-sm">add</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">TAP EMPTY SLOT TO BUILD</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* LIVE EVENTS */}
      <div className="flex flex-col border-b border-[#2A2A45] h-64">
        <div className="p-3 bg-[#0F0F1E]/80 flex items-center justify-between">
          <h2 className="font-fantasy text-xs uppercase tracking-widest text-accent-pink flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">bolt</span> Live Events
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-teal shadow-[0_0_8px_rgba(0,245,212,0.8)] animate-pulse"></span>
            <span className="text-[8px] font-mono text-accent-teal uppercase tracking-widest">Live</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
           <LiveEventFeed />
        </div>
      </div>

      {/* TACTICAL STATUS */}
      <div className="flex flex-col border-b border-[#2A2A45]">
        <div className="p-3 flex items-center justify-between">
          <h2 className="font-fantasy text-xs uppercase tracking-widest text-accent-teal flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">monitor_heart</span> Tactical Status
          </h2>
          <span className="h-1.5 w-1.5 rounded-full bg-accent-teal animate-pulse"></span>
        </div>
        <div className="p-3 space-y-2">
          <div className="p-3 bg-[#080810] border border-[#2A2A45] rounded-lg flex items-center justify-between hover:border-primary/40 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-sm">swords</span>
              </div>
              <span className="text-[10px] font-mono text-[#A09DC0] uppercase tracking-widest">Raid Success</span>
            </div>
            <span className="text-accent-teal font-mono font-bold text-sm">{raidSuccess}%</span>
          </div>

          <div className="p-3 bg-[#080810] border border-[#2A2A45] rounded-lg flex items-center justify-between hover:border-primary/40 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-sm">shield</span>
              </div>
              <span className="text-[10px] font-mono text-[#A09DC0] uppercase tracking-widest">Base Defense</span>
            </div>
            <span className="text-accent-pink font-mono font-bold text-sm">{baseDefense}%</span>
          </div>
        </div>
      </div>

      {/* COMMAND UPLINK */}
      <div className="p-3">
        <div className="p-4 bg-[#080810] border border-primary/20 rounded-xl flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group">
          <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <span className="material-symbols-outlined text-primary text-xl">terminal</span>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-mono text-[#6B68A0] uppercase tracking-widest">Command Uplink</p>
            <p className="text-[11px] font-fantasy font-bold text-white uppercase tracking-wide mt-0.5">Generate Battle Report</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
