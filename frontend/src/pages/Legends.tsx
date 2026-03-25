import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { publicClient, reactivityClient } from '../lib/somniaClients';
import { encodeEventTopics } from 'viem';
import { CONTRACT_ADDRESSES, LEADERBOARD_CONTRACT_ABI, EMPIRE_REGISTRY_ABI } from '../constants/contracts';
import { useReactivity } from '../hooks/useReactivity';

interface LegendPlayer {
  rank: number;
  name: string;
  wallet: string;
  raidsWon: number;
  lootEarned: number;
  hp: number;
  isUser?: boolean;
}

interface BattleEvent {
  id: number;
  block: number;
  attacker: string;
  defender: string;
  loot: number;
  type: 'victory' | 'repelled';
}

const EMPIRES = ["Dragon's Lair", "Iron Fortress", "Shadow Realm", "Mystic Grove", "Stone Keep", "Void Citadel", "Neon Bastion"];

export default function Legends() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<any[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [opsToday, setOpsToday] = useState(0);
  const [cycleLoot, setCycleLoot] = useState(0);
  const [empiresActive, setEmpiresActive] = useState(0);
  const { subscribeToRankingUpdated } = useReactivity();

  const [battles, setBattles] = useState<BattleEvent[]>([
    { id: 1, block: 85013, attacker: "Mystic Grove", defender: "Bandit Camp", loot: 450, type: 'victory' },
    { id: 2, block: 85005, attacker: "Dragon's Lair", defender: "Stone Keep", loot: 1200, type: 'victory' },
    { id: 3, block: 84976, attacker: "Stone Keep", defender: "Mystic Grove", loot: 890, type: 'victory' },
    { id: 4, block: 84962, attacker: "Dragon's Lair", defender: "Iron Fortress", loot: 2400, type: 'victory' },
    { id: 5, block: 84953, attacker: "Iron Fortress", defender: "Shadow Realm", loot: 0, type: 'repelled' },
  ]);

  const [feedBlock, setFeedBlock] = useState(85013);

  // Live reactive feed — new battle results slide in from top
  useEffect(() => {
    const interval = setInterval(() => {
      setFeedBlock(prev => prev + 1);
      
      const from = EMPIRES[Math.floor(Math.random() * EMPIRES.length)];
      let to = EMPIRES[Math.floor(Math.random() * EMPIRES.length)];
      if (to === from) to = EMPIRES[(EMPIRES.indexOf(from) + 1) % EMPIRES.length];
      
      const type = Math.random() > 0.65 ? 'repelled' : 'victory';
      const loot = type === 'victory' ? Math.floor(Math.random() * 3000 + 200) : 0;

      const newBattle: BattleEvent = {
        id: Date.now(),
        block: feedBlock + 1,
        attacker: from,
        defender: to,
        loot: loot,
        type: type
      };

      setBattles(prev => [newBattle, ...prev].slice(0, 8));
    }, 3500);

    return () => clearInterval(interval);
  }, [feedBlock]);

  const fetchLeaderboard = useCallback(async () => {
      try {
        setPlayersLoading(true);
        const result = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT as `0x${string}`,
          abi: LEADERBOARD_CONTRACT_ABI,
          functionName: 'getTopPlayers',
          args: [50]
        }) as any;

        if (!result || !result[0]) return;

        const addresses: string[] = result[0];
        const topWins: bigint[] = result[1];
        const empireNames: string[] = result[2];
        const playerDetails = await Promise.all(
          addresses.map(async (addr, i) => {
            let loot = 0;
            let wins = Number(topWins[i]);
            let losses = 0;
            try {
              const stats = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT as `0x${string}`,
                abi: LEADERBOARD_CONTRACT_ABI,
                functionName: 'getPlayerStats',
                args: [addr as `0x${string}`]
              }) as any;
              loot = Number(stats.totalLootEarned || 0);
              wins = Number(stats.wins || wins);
              losses = Number(stats.losses || 0);
            } catch (e) {}
            const totalBattles = wins + losses;
            const winRate = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;
            return {
              address: addr,
              name: empireNames[i] || addr.slice(0, 6) + '...' + addr.slice(-4),
              wins,
              losses,
              loot,
              winRate,
              rank: i + 1
            };
          })
        );

        setPlayers(playerDetails);
        setEmpiresActive(addresses.length);

        const totalLoot = playerDetails.reduce((sum, p) => sum + p.loot, 0);
        const totalOps = playerDetails.reduce((sum, p) => sum + p.wins + p.losses, 0);
        setCycleLoot(totalLoot);
        setOpsToday(totalOps);
      } catch (e) {
        console.error('[Legends] Failed to fetch leaderboard:', e);
      } finally {
        setPlayersLoading(false);
      }
  }, []);

  // Initial fetch + 10s polling fallback
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // Reactivity: refetch instantly on ranking changes or new empire registrations
  useEffect(() => {
    const unsubRanking = subscribeToRankingUpdated(() => {
      fetchLeaderboard();
    });

    let unsubEmpire: (() => void) | undefined;
    reactivityClient.subscribe({
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.EMPIRE_REGISTRY],
      topicOverrides: encodeEventTopics({ abi: EMPIRE_REGISTRY_ABI, eventName: "EmpireRegistered" }) as `0x${string}`[],
      onData: () => { fetchLeaderboard(); }
    }).then((result: any) => {
      if (!(result instanceof Error)) unsubEmpire = () => result.unsubscribe();
    }).catch(() => {});

    return () => {
      unsubRanking();
      if (unsubEmpire) unsubEmpire();
    };
  }, [fetchLeaderboard, subscribeToRankingUpdated]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0A0A0F] text-slate-100 font-sans">
      <style>{`
        .gold-glow { text-shadow: 0 0 15px rgba(255, 214, 10, 0.4); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2A2A45; border-radius: 10px; }
      `}</style>

      {/* Header Section */}
      <header className="p-4 md:p-8 pb-3 md:pb-4 shrink-0 flex flex-col sm:flex-row sm:items-end justify-between gap-3 md:gap-4">
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl sm:text-4xl md:text-5xl font-fantasy font-black text-[#FFD60A] gold-glow italic mb-1 uppercase tracking-tighter"
          >
            🏆 Hall of Legends
          </motion.h2>
          <p className="text-[#00F5D4]/70 font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em]">
            Live rankings · Updated via Somnia Reactivity
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-[#0F0F1E]/40 backdrop-blur-md border border-white/5 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00F5D4] animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Sync Active</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col xl:flex-row gap-4 md:gap-8 p-3 md:p-8 pt-2 md:pt-4 overflow-hidden">
        
        {/* Left: Leaderboard Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-2 min-w-0">
          <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 min-w-[480px]">
            <div className="col-span-1 text-[11px] md:text-[10px] font-mono text-[#5A5880] uppercase tracking-widest">Pos</div>
            <div className="col-span-4 text-[11px] md:text-[10px] font-mono text-[#5A5880] uppercase tracking-widest">Empire</div>
            <div className="col-span-2 text-[11px] md:text-[10px] font-mono text-[#5A5880] uppercase tracking-widest text-center">Campaigns</div>
            <div className="col-span-2 text-[11px] md:text-[10px] font-mono text-[#5A5880] uppercase tracking-widest text-center">Loot Yield</div>
            <div className="col-span-2 text-[11px] md:text-[10px] font-mono text-[#5A5880] uppercase tracking-widest text-center">Durability</div>
            <div className="col-span-1"></div>
          </div>

          <div className="flex flex-col gap-2 min-w-[480px]">
            {playersLoading ? (
              <div className="text-center py-20 bg-[#0F0F1E] rounded-xl border border-[#2A2A45] flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-[#FFD60A]/20 border-t-[#FFD60A] rounded-full animate-spin" />
                <p className="font-mono text-sm text-[#5A5880] uppercase tracking-widest animate-pulse">Scanning sector rankings...</p>
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-8 font-mono text-[#5A5880]">No ranked commanders found</div>
            ) : (
              players.map((player) => (
                <motion.div 
                  key={player.address}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`grid grid-cols-12 gap-2 items-center px-4 py-4 rounded-xl transition-all cursor-pointer group bg-[#0F0F1E] border border-[#2A2A45] hover:border-[#C084FC]/40 ${
                    player.rank === 1 ? 'border-[#FFD60A]/30 hover:border-[#FFD60A]/60 shadow-[0_0_20px_rgba(255,214,10,0.05)]' : ''
                  }`}
                >
                  <div className="col-span-1 flex items-center justify-center">
                    {player.rank === 1 ? <span className="text-xl">🥇</span> : 
                     player.rank === 2 ? <span className="text-xl">🥈</span> :
                     player.rank === 3 ? <span className="text-xl">🥉</span> :
                     <span className="font-mono text-sm font-bold text-[#5A5880]">#{player.rank}</span>}
                  </div>
                  
                  <div className="col-span-4 flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-fantasy text-sm truncate text-[#F0EEFF]">
                        {player.name}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#5A5880] truncate">{player.address}</span>
                  </div>

                  <div className="col-span-2 text-center">
                    <span className="font-mono text-sm font-bold text-[#F0EEFF]">{player.wins.toLocaleString()}</span>
                  </div>

                  <div className="col-span-2 text-center">
                    <span className="font-mono text-sm font-bold text-[#FFD60A]">
                       {player.loot > 0 ? '+' + player.loot.toLocaleString() : '--'} 💰
                    </span>
                  </div>

                  <div className="col-span-2 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-[#00F5D4]">{player.winRate}%</span>
                    </div>
                    <div className="h-1 w-full bg-[#2A2A45] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${player.winRate}%` }}
                        className="h-full rounded-full bg-[#00F5D4]"
                      />
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <button 
                      onClick={() => navigate('/siege', { state: { targetAddress: player.address } })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded bg-[#C084FC]/20 border border-[#C084FC]/30 text-[#C084FC] text-[9px] font-mono uppercase"
                    >
                      Raid
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          </div>{/* end overflow-x-auto */}
        </div>

        {/* Right: Live Battles Feed */}
        <aside className="w-full xl:w-80 shrink-0 flex flex-col gap-5">
          <div className="flex items-center justify-between xl:justify-start gap-3 px-2 border-b border-[#2A2A45] pb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#C084FC] text-2xl animate-pulse">bolt</span>
              <h3 className="text-xs font-fantasy font-black uppercase tracking-[0.3em] text-[#F0EEFF] italic">Reactive Feed</h3>
            </div>
            <span className="text-[9px] font-mono text-[#C084FC] font-bold px-2 py-0.5 bg-[#C084FC]/10 rounded uppercase">Live</span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 max-h-[260px] xl:max-h-[500px]" id="reactive-feed">
            <AnimatePresence initial={false}>
              {battles.map((battle) => (
                <motion.div
                  key={battle.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#0F0F1E] border border-[#2A2A45] gap-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-[9px] font-mono text-[#5A5880]">BLK #{battle.block.toLocaleString()}</span>
                    <span className="text-[11px] text-[#D4D0F0] truncate">{battle.attacker} → {battle.defender}</span>
                    <span className={`text-[10px] font-mono ${battle.type === 'victory' ? 'text-[#FFD60A]' : 'text-[#A09DC0]'}`}>
                      {battle.type === 'victory' ? `+${battle.loot.toLocaleString()} Credits looted` : '0 Credits · Defense held'}
                    </span>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded text-[9px] font-bold border uppercase ${
                    battle.type === 'victory' 
                      ? 'bg-[#00F5D4]/10 text-[#00F5D4] border-[#00F5D4]/20' 
                      : 'bg-[#F72585]/10 text-[#F72585] border-[#F72585]/20'
                  }`}>
                    {battle.type}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </aside>

      </div>

      {/* Stats Strip Bottom */}
      <footer className="border-t border-[#2A2A45] bg-[#0D0D1A] px-3 md:px-6 py-3 flex flex-wrap items-center gap-3 md:gap-6 shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00F5D4] animate-pulse"></span>
          <span className="text-[10px] font-mono text-[#A09DC0]">OPS TODAY: <span className="text-[#F0EEFF] font-bold">{opsToday}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FFD60A] animate-pulse"></span>
          <span className="text-[10px] font-mono text-[#A09DC0]">CYCLE LOOT: <span className="text-[#FFD60A] font-bold">{cycleLoot.toLocaleString()}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C084FC] animate-pulse"></span>
          <span className="text-[10px] font-mono text-[#A09DC0]">EMPIRES ACTIVE: <span className="text-[#C084FC] font-bold">{empiresActive}</span></span>
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <span className="text-[10px] font-mono text-[#5A5880]">CURRENT GAS: <span className="text-[#00F5D4] font-mono">1.2 GWEI</span></span>
        </div>
      </footer>
    </div>
  );
}
