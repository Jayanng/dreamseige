import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract } from 'wagmi';
import { Trophy, TrendingUp, ShieldAlert, Skull, Sword, Wallet, Info } from 'lucide-react';
import { publicClient } from '../lib/somniaClients';
import { CONTRACT_ADDRESSES, PVP_ARENA_ABI, LEADERBOARD_CONTRACT_ABI } from '../constants/contracts';
import { decodeEventLog } from 'viem';

interface BattleLogEntry {
  id: string;
  type: 'attack' | 'defense';
  outcome: 'victory' | 'defeat' | 'repelled';
  opponent: string;
  opponentName: string;
  block: number;
  timestamp: string;
  loot: {
    gold: number;
    wood: number;
    stone: number;
  };
  casualties: number;
  baseDamage: number;
  strategy: string;
}

export default function BattleLog() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const [filter, setFilter] = useState<'all' | 'victory' | 'defeat'>('all');
  
  const { data: playerStats } = useReadContract({
    address: CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT,
    abi: LEADERBOARD_CONTRACT_ABI,
    functionName: 'getPlayerStats',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const stats = (playerStats as any) || {
    wins: 0,
    losses: 0,
    currentStreak: 0,
    totalLootEarned: 0n,
  };

  const winRate = stats.wins + stats.losses > 0 
    ? (stats.wins / (stats.wins + stats.losses)) * 100 
    : 0;

  const netLoot = Number(stats.totalLootEarned || 0n);

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string>('');

  useEffect(() => {
    if (!address) return;
    const key = `battleLogs_${address.toLowerCase()}`;

    const loadLogs = () => {
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          setLogs(JSON.parse(cached));
        } catch (e) {}
      }
      setLogsLoading(false);
    };

    // Load immediately
    loadLogs();

    // Refresh when window gets focus (switching tabs)
    window.addEventListener('focus', loadLogs);

    // Refresh automatically when localStorage is updated from Siege.tsx
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key) loadLogs();
    };
    window.addEventListener('storage', handleStorage);

    // Also poll every 5 seconds as fallback for same-tab updates
    const interval = setInterval(loadLogs, 5000);

    return () => {
      window.removeEventListener('focus', loadLogs);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [address]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'victory') return log.type === 'VICTORY' || log.type === 'REPELLED';
    if (filter === 'defeat') return log.type === 'DEFEAT';
    return true;
  });

  return (
    <div className="h-full flex flex-col p-4 md:p-8 gap-6 md:gap-8 overflow-y-auto md:overflow-hidden bg-[#0A0A0F] text-slate-100 font-sans pb-20 md:pb-8">
      <style>{`
        .active-filter { 
          background: rgba(155, 93, 229, 0.15) !important; 
          border-color: rgba(155, 93, 229, 0.5) !important; 
          color: #C084FC !important; 
        }
      `}</style>
      {/* CHANGE 2: Tactical Summary Header */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 shrink-0">
        {/* Success Rate */}
        <div className="p-5 rounded-xl bg-[#0F0F1E] border border-[#2A2A45] hover:border-primary/40 transition-colors relative overflow-hidden group">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-mono text-[#5A5880] uppercase tracking-widest">Success Rate</p>
            <span className="material-symbols-outlined text-[#00F5D4] text-lg">trending_up</span>
          </div>
          <p className="font-mono text-3xl font-bold text-[#00F5D4]">{winRate.toFixed(1)}%</p>
          <div className="mt-2 h-1 w-full bg-[#2A2A45] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${winRate}%` }}
              className="h-full bg-[#00F5D4] rounded-full shadow-[0_0_8px_rgba(0,245,212,0.6)]" 
            />
          </div>
          <p className="text-[10px] font-mono text-[#00F5D4] mt-1.5">{stats.wins} WINS / {stats.losses} LOSSES</p>
        </div>

        {/* Total Loot Earned */}
        <div className="p-5 rounded-xl bg-[#0F0F1E] border border-[#2A2A45] hover:border-primary/40 transition-colors relative overflow-hidden group">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-mono text-[#5A5880] uppercase tracking-widest">Total Loot Earned</p>
            <span className="material-symbols-outlined text-[#FFD60A] text-lg">payments</span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="font-mono text-3xl font-bold text-[#FFD60A]">+{netLoot.toLocaleString()}</p>
            <p className="font-mono text-sm text-[#A09DC0]">Looted</p>
          </div>
          <p className="text-[10px] font-mono text-[#6B68A0] mt-2">Profit margin holding steady</p>
        </div>

        {/* Threat Level */}
        <div className="p-5 rounded-xl bg-[#0F0F1E] border border-[#F72585]/20 hover:border-[#F72585]/40 transition-colors relative overflow-hidden group">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-mono text-[#5A5880] uppercase tracking-widest">Threat Level</p>
            <span className="material-symbols-outlined text-[#F72585] text-lg">warning</span>
          </div>
          <p className="font-fantasy text-3xl font-bold text-[#F72585]">
            {stats.currentStreak > 3 ? 'LEGENDARY' : stats.currentStreak > 0 ? 'ACTIVE' : 'STABLE'}
          </p>
          <div className="mt-2 flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full ${i < stats.currentStreak ? 'bg-[#F72585]' : 'bg-[#2A2A45]'}`}
              ></div>
            ))}
          </div>
          <p className="text-[10px] font-mono text-[#F72585] mt-1.5">{stats.currentStreak} Battle Streak</p>
        </div>
      </section>

      {/* Battle Feed */}
      <section className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* CHANGE 3: Combat Archives Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-2 shrink-0">
          <h2 className="font-fantasy text-base sm:text-lg text-[#C084FC] flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-lg">history_edu</span>
            Combat Archives
            {lastSynced && (
              <span className="font-mono text-xs text-[#5A5880] ml-3">
                Last synced: {lastSynced}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar scroll-smooth">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wide border transition-colors ${filter === 'all' ? 'active-filter' : 'bg-[#0F0F1E] border-[#2A2A45] text-[#6B68A0] hover:border-primary/40 hover:text-[#C084FC]'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('victory')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wide border transition-colors ${filter === 'victory' ? 'active-filter' : 'bg-[#0F0F1E] border-[#2A2A45] text-[#6B68A0] hover:border-[#00F5D4]/40 hover:text-[#00F5D4]'}`}
            >
              Victory
            </button>
            <button 
              onClick={() => setFilter('defeat')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wide border transition-colors ${filter === 'defeat' ? 'active-filter' : 'bg-[#0F0F1E] border-[#2A2A45] text-[#6B68A0] hover:border-[#F72585]/40 hover:text-[#F72585]'}`}
            >
              Defeat
            </button>
            <button 
              onClick={() => {
                const exportData = logs.map((log, i) => {
                  const type = log.type || 'UNKNOWN';
                  const opponent = log.opponent || 'Unknown';
                  const loot = log.loot > 0 ? `+${log.loot.toLocaleString()}` : log.loot === 0 ? '0' : log.loot.toLocaleString();
                  const block = log.blockNumber || '--';
                  const tx = log.txHash || '--';
                  const combatId = log.id || '--';
                  return [
                    `--- COMBAT RECORD #${i + 1} ---`,
                    `Result:     ${type}`,
                    `Opponent:   ${opponent}`,
                    `Loot:       ${loot} Credits`,
                    `Block:      #${block}`,
                    `Combat ID:  #${combatId}`,
                    `TX Hash:    ${tx}`,
                    `Explorer:   https://shannon-explorer.somnia.network/tx/${tx}`,
                    '',
                  ].join('\n');
                }).join('\n');

                const header = [
                  '========================================',
                  '       DREAMSIEGE — COMBAT ARCHIVES',
                  '========================================',
                  `Commander:  ${address}`,
                  `Exported:   ${new Date().toLocaleString()}`,
                  `Total Logs: ${logs.length}`,
                  '========================================',
                  '',
                  '',
                ].join('\n');

                const content = header + exportData;
                const blob = new Blob([content], { type: 'application/msword' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `DreamSiege_Combat_Log_${address?.slice(0, 8)}_${Date.now()}.doc`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wide bg-[#0F0F1E] border border-[#2A2A45] text-[#6B68A0] hover:border-primary/40 hover:text-[#C084FC] transition-colors"
            >
              Export Logs
            </button>
          </div>
        </div>

        {/* CHANGE 1: Battle Log Rows */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-[#2A2A45] rounded-xl">
              <p className="font-mono text-sm text-[#5A5880]">No combat archives found yet. Start a raid to begin your log!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredLogs.map((log, index) => (
                <motion.div
                  key={`${log.id || 'unknown'}-${log.txHash || log.timestamp}-${index}`}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl bg-[#0F0F1E] border transition-all group ${
                    log.type === 'VICTORY' || log.type === 'REPELLED' ? 'border-[#00F5D4]/20 hover:border-[#00F5D4]/40' :
                    'border-[#F72585]/20 hover:border-[#F72585]/40'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                    log.type === 'VICTORY' || log.type === 'REPELLED' ? 'bg-[#00F5D4]/10 border-[#00F5D4]/20 text-[#00F5D4]' :
                    'bg-[#F72585]/10 border-[#F72585]/20 text-[#F72585]'
                  }`}>
                    <span className="material-symbols-outlined">
                      {log.type === 'DEFEAT' ? 'skull' : log.type === 'VICTORY' ? 'swords' : 'shield'}
                    </span>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase shrink-0 ${
                        log.type === 'VICTORY' || log.type === 'REPELLED' ? 'bg-[#00F5D4]/10 text-[#00F5D4] border-[#00F5D4]/20' :
                        'bg-[#F72585]/10 text-[#F72585] border-[#F72585]/20'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-[9px] font-mono text-[#5A5880]">#BLK {log.blockNumber}</span>
                    </div>
                    <p className="font-fantasy text-base text-[#F0EEFF] truncate">
                      {log.opponent || 'Unknown Empire'}
                    </p>
                    {log.txLink ? (
                      <a href={log.txLink} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-[#9B5DE5] hover:text-[#00F5D4] underline transition-colors">
                        View on Explorer →
                      </a>
                    ) : (
                      <span className="font-mono text-xs text-[#5A5880]">No tx link</span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-8 shrink-0 px-6">
                    <div className="text-center">
                      <p className="text-[9px] font-mono text-[#5A5880] uppercase tracking-widest mb-1">Combat ID</p>
                      <p className="font-mono text-sm font-bold text-[#A09DC0]">
                        {log.id ? `#${log.id}` : '--'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-mono text-[#5A5880] uppercase tracking-widest mb-1">Loot Yield</p>
                      <p className={`font-mono text-sm font-bold ${log.loot > 0 ? 'text-[#FFD60A]' : log.loot < 0 ? 'text-[#F72585]' : 'text-[#A09DC0]'}`}>
                        {log.loot > 0 ? '+' : ''}{log.loot.toLocaleString()} 💰
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => navigate('/siege')}
                    className={`shrink-0 px-2 sm:px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap ${
                      log.type === 'DEFEAT'
                        ? 'bg-[#F72585]/10 border border-[#F72585]/30 text-[#F72585] hover:bg-[#F72585]/20'
                        : 'bg-primary/20 border border-primary/30 text-[#C084FC] hover:bg-primary/30'
                    }`}
                  >
                    Counter-Siege
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </section>
    </div>
  );
}
