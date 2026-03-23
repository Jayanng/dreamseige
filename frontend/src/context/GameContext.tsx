import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useAllBuildings, useBase } from '../hooks/useGame';
import { useReactivity } from '../hooks/useReactivity';
import { type BuildingData, type BaseData, CONTRACT_ADDRESSES, RESOURCE_VAULT_ABI, PVP_ARENA_ABI, EMPIRE_REGISTRY_ABI } from '../constants/contracts';
import { publicClient } from '../lib/somniaClients';

export interface GameEvent {
  id: string;
  type: 'attack' | 'defense' | 'upgrade' | 'resource' | 'build' | 'system';
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
}

interface BuildingInfo {
  buildingType: number;
  level: number;
  slot: number;
}

export interface IncomingRaid {
  battleId: bigint;
  attacker: string;
  attackerEmpire: string;
  vanguard: number;
  etaSeconds: number;
}

interface GameContextType {
  selectedBuilding: BuildingInfo | null;
  setSelectedBuilding: (b: BuildingInfo | null) => void;
  events: GameEvent[];
  addEvent: (type: GameEvent['type'], message: string, severity?: GameEvent['severity']) => void;
  buildModalSlot: number | null;
  setBuildModalSlot: (slot: number | null) => void;

  // New decentralized state
  buildings: BuildingData[];
  base: BaseData | undefined;
  setBase: React.Dispatch<React.SetStateAction<BaseData | undefined>>;
  resources: {
    gold: bigint;
    wood: bigint;
    stone: bigint;
    vanguard: bigint;
    timestamp: number;
  };
  refreshEmpireState: () => Promise<void>;
  isLoading: boolean;
  incomingRaid: IncomingRaid | null;
  setIncomingRaid: React.Dispatch<React.SetStateAction<IncomingRaid | null>>;
  isReactivityLive: boolean;
}

const ARENA_ADDRESSES = [
  CONTRACT_ADDRESSES.PVP_ARENA,
  '0xd8665b7f204b073843334d9747317829e5a83945',
  '0xc16548ee3533c0653e6fb256db8ef61278816bed',
  '0x67097c8e6be1f1bd8b8094353ac4e7b8cd137b01',
];

const BATTLE_RESOLVED_EVENT = {
  type: 'event' as const,
  name: 'BattleResolved',
  inputs: [
    { type: 'uint256', name: 'battleId', indexed: true },
    { type: 'address', name: 'winner', indexed: true },
    { type: 'address', name: 'loser', indexed: true },
    { type: 'bool', name: 'attackerWon' },
    { type: 'uint64', name: 'creditsLooted' },
    { type: 'uint64', name: 'biomassLooted' },
    { type: 'uint64', name: 'mineraLooted' },
    { type: 'string', name: 'winnerEmpire' },
    { type: 'string', name: 'loserEmpire' },
  ]
};

async function searchForBattleLog(battleId: bigint, latestBlock: bigint) {
  const fromBlock = latestBlock > 1000n ? latestBlock - 1000n : 0n;
  for (const arenaAddr of ARENA_ADDRESSES) {
    const logs = await publicClient.getLogs({
      address: arenaAddr as `0x${string}`,
      event: BATTLE_RESOLVED_EVENT,
      fromBlock,
      toBlock: latestBlock
    });
    console.log('[GameContext] Found logs:', logs.length, 'at address:', arenaAddr);
    const match = logs.find(l => (l.args as any).battleId?.toString() === battleId.toString());
    if (match) return match;
  }
  return null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { address } = useAccount();
  const { subscribeToResourceTick, subscribeToResourcesCollected, subscribeToAllResolutions, subscribeToIncomingAttack } = useReactivity();
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingInfo | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [buildModalSlot, setBuildModalSlot] = useState<number | null>(null);
  const [incomingRaid, setIncomingRaid] = useState<IncomingRaid | null>(null);

  // RESOURCES STATE
  const [resources, setResources] = useState({
    gold: 0n,
    wood: 0n,
    stone: 0n,
    vanguard: 0n,
    timestamp: Date.now()
  });
  const [isReactivityLive, setIsReactivityLive] = useState(false);

  // REAL DATA HOOKS
  const { buildings: onChainBuildings, refetch: refetchBuildings, isLoading: loadingBuildings } = useAllBuildings(address);
  const { base: onChainBase, refetch: refetchBase, isLoading: loadingBase } = useBase(address);
  const [base, setBase] = useState<BaseData | undefined>(undefined);

  // Connection tracker for Reactivity SDK
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        ws = new WebSocket('wss://dream-rpc.somnia.network/ws');

        ws.onopen = () => {
          setIsReactivityLive(true);
        };

        ws.onclose = () => {
          setIsReactivityLive(false);
          // Try to reconnect after 5 seconds
          reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          setIsReactivityLive(false);
          ws?.close();
        };
      } catch (e) {
        setIsReactivityLive(false);
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    // Also listen to browser online/offline events
    const handleOffline = () => setIsReactivityLive(false);
    const handleOnline = () => connect();

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      ws?.close();
      clearTimeout(reconnectTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Sync base state with on-chain hook
  useEffect(() => {
    if (onChainBase) {
      setBase(onChainBase);
    }
  }, [onChainBase]);
  
  const { data: vaultData, refetch: refetchResources } = useReadContract({
    address: CONTRACT_ADDRESSES.RESOURCE_VAULT,
    abi: RESOURCE_VAULT_ABI,
    functionName: 'getResources',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  }) as any;

  // Sync resources from vaultData
  React.useEffect(() => {
    if (vaultData) {
      setResources({
        gold: vaultData.credits,
        wood: vaultData.biomass,
        stone: vaultData.minera,
        vanguard: vaultData.vanguard,
        timestamp: Number(vaultData.lastTickAt) * 1000
      });
    }
  }, [vaultData]);

  // State Refresher
  const refreshEmpireState = useCallback(async () => {
    await Promise.all([
      refetchBuildings(),
      refetchBase(),
      refetchResources()
    ]);
  }, [refetchBuildings, refetchBase, refetchResources]);

  // Event System
  const addEvent = useCallback((type: GameEvent['type'], message: string, severity: GameEvent['severity'] = 'low') => {
    const newEvent: GameEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: Date.now(),
      severity,
    };
    setEvents((prev: any) => [newEvent, ...prev].slice(0, 20));
  }, [setEvents]);

  // Reactivity for resources
  React.useEffect(() => {
    if (!address) return;
    return subscribeToResourceTick(address, (gold, wood, stone, vanguard, timestamp) => {
      setResources((prev: any) => ({ ...prev, gold, wood, stone, vanguard, timestamp: Number(timestamp) * 1000 }));
    });
  }, [address, subscribeToResourceTick]);

  // Refetch when resources are explicitly collected
  React.useEffect(() => {
    if (!address) return;
    return subscribeToResourcesCollected(address, () => {
      refreshEmpireState();
      addEvent('resource', 'Harvested accumulated resources from all structures.', 'low');
    });
  }, [address, subscribeToResourcesCollected, refreshEmpireState, addEvent]);

  // GLOBAL BATTLE LOG SYNC (Ensures concurrent updates for both players)
  React.useEffect(() => {
    if (!address) return;
    
    return subscribeToAllResolutions((battleId, winner, loser, attackerWon, credits, biomass, minera, winnerEmpire, loserEmpire, txHash, blockNumber) => {
      const isWinner = winner.toLowerCase() === address.toLowerCase();
      const isLoser = loser.toLowerCase() === address.toLowerCase();
      
      if (!isWinner && !isLoser) return;

      const isAttacker = (isWinner && attackerWon) || (isLoser && !attackerWon);
      const totalLoot = Number(credits + biomass + minera);
      
      // Format the log entry exactly like Siege.tsx expects
      const logEntry = {
        id: battleId.toString(),
        type: isAttacker 
          ? (attackerWon ? 'VICTORY' : 'DEFEAT') 
          : (attackerWon ? 'DEFEAT' : 'REPELLED'),
        opponent: isAttacker ? loserEmpire : winnerEmpire,
        loot: isAttacker
          ? (attackerWon ? totalLoot : -totalLoot)  // attacker won: +loot gained, attacker lost: -loot penalty
          : (attackerWon ? -totalLoot : totalLoot),  // defender lost: -loot taken, defender won: +loot gained
        blockNumber: Number(blockNumber),
        txHash: txHash,
        timestamp: Date.now(),
        txLink: txHash ? `https://shannon-explorer.somnia.network/tx/${txHash}` : null
      };

      // Save to localStorage
      const key = `battleLogs_${address.toLowerCase()}`;
      const cached = localStorage.getItem(key);
      let logs = [];
      if (cached) {
        try {
          logs = JSON.parse(cached);
        } catch (e) {}
      }

      // Avoid duplicate logs (check by battleId)
      if (!logs.some((l: any) => l.id === logEntry.id)) {
        const updated = [logEntry, ...logs].slice(0, 50);
        localStorage.setItem(key, JSON.stringify(updated));
        
        // Dispatch event for other components (BattleLog.tsx)
        window.dispatchEvent(new StorageEvent('storage', {
          key,
          newValue: JSON.stringify(updated)
        }));

        // Enrich with real txHash by fetching from chain (works for both players, retries at 7s)
        (async () => {
          try {
            console.log('[GameContext] Enrichment triggered for address:', address, 'battleId:', battleId.toString());

            // First attempt after 3s
            await new Promise(resolve => setTimeout(resolve, 3000));
            let latestBlock = await publicClient.getBlockNumber();
            console.log('[GameContext] Searching for battleId:', battleId.toString(), 'in last 1000 blocks');
            let matchingLog = await searchForBattleLog(battleId, latestBlock);
            console.log('[GameContext] First attempt matching:', !!matchingLog);

            // Retry after 7s total if first attempt failed
            if (!matchingLog) {
              await new Promise(resolve => setTimeout(resolve, 4000));
              latestBlock = await publicClient.getBlockNumber();
              matchingLog = await searchForBattleLog(battleId, latestBlock);
              console.log('[GameContext] Retry result - matching:', !!matchingLog);
            }

            if (matchingLog?.transactionHash) {
              const existing = JSON.parse(localStorage.getItem(key) || '[]');
              const enriched = existing.map((l: any) =>
                l.id === battleId.toString()
                  ? { ...l, txHash: matchingLog.transactionHash, txLink: `https://shannon-explorer.somnia.network/tx/${matchingLog.transactionHash}` }
                  : l
              );
              localStorage.setItem(key, JSON.stringify(enriched));
              console.log('[GameContext] Enriched entry with txLink:', matchingLog.transactionHash);
              window.dispatchEvent(new StorageEvent('storage', { key }));
            }
          } catch (e) {}
        })();

        // Notify user via UI Event
        addEvent('attack', `Battle Archive Updated: ${logEntry.type} vs ${logEntry.opponent}`, isAttacker ? (attackerWon ? 'low' : 'medium') : (attackerWon ? 'high' : 'low'));
        
        // Refresh state to show new resource counts
        refreshEmpireState();
      }
    });
  }, [address, subscribeToAllResolutions, addEvent, refreshEmpireState]);

  // Incoming raid subscription
  React.useEffect(() => {
    if (!address) return;
    return subscribeToIncomingAttack(address, async (battleId, attacker, atkPower) => {
      // Set immediately with fallback values so overlay appears without delay
      setIncomingRaid({
        battleId,
        attacker,
        attackerEmpire: attacker.slice(0, 6) + '...' + attacker.slice(-4),
        vanguard: atkPower,
        etaSeconds: 180,
      });

      // Fetch real vanguard from ResourceVault
      let vanguard = atkPower;
      try {
        const vaultData = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.RESOURCE_VAULT as `0x${string}`,
          abi: RESOURCE_VAULT_ABI,
          functionName: 'vaults',
          args: [attacker as `0x${string}`]
        }) as any;
        vanguard = Number(Array.isArray(vaultData) ? vaultData[3] : vaultData.vanguard);
      } catch (e) {}

      // Fetch empire name
      let attackerEmpire = attacker.slice(0, 6) + '...' + attacker.slice(-4);
      try {
        const empireData = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.EMPIRE_REGISTRY as `0x${string}`,
          abi: EMPIRE_REGISTRY_ABI,
          functionName: 'getEmpire',
          args: [attacker as `0x${string}`]
        }) as any;
        if (empireData?.name) attackerEmpire = empireData.name;
      } catch (e) {}

      // Update with enriched data
      setIncomingRaid(prev => prev?.battleId === battleId
        ? { ...prev, vanguard, attackerEmpire }
        : prev
      );
    });
  }, [address, subscribeToIncomingAttack]);

  // Countdown timer — decrements etaSeconds every second, clears when it hits 0
  useEffect(() => {
    if (!incomingRaid) return;
    const timer = setInterval(() => {
      setIncomingRaid(prev => {
        if (!prev) return null;
        if (prev.etaSeconds <= 1) return null;
        return { ...prev, etaSeconds: prev.etaSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingRaid?.battleId]);

  const buildings = React.useMemo(() =>
    onChainBuildings || Array(100).fill({ buildingType: 0, level: 0, upgradeEndsAt: 0 }),
    [onChainBuildings]
  );





  return (
    <GameContext.Provider value={{
      selectedBuilding,
      setSelectedBuilding,
      events,
      addEvent,
      buildModalSlot,
      setBuildModalSlot,
      buildings,
      base,
      setBase,
      resources,
      refreshEmpireState,
      isLoading: loadingBuildings || loadingBase,
      incomingRaid,
      setIncomingRaid,
      isReactivityLive,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
