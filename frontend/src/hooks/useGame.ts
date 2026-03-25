// src/hooks/useGame.ts
// ─────────────────────────────────────────────────────────────────────────────
// DreamSiege — All game interaction hooks
// One hook per on-chain action the frontend needs.
// ─────────────────────────────────────────────────────────────────────────────

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import React, { useState, useEffect, useMemo } from "react";
import {
  CONTRACT_ADDRESSES,
  BASE_CONTRACT_ABI,
  PVP_ARENA_ABI,
  LEADERBOARD_CONTRACT_ABI,
  type BaseData,
  type BuildingData,
  type AttackData,
  type PlayerStats,
} from "../constants/contracts";
import { streamsClient } from "../lib/somniaClients";
import { useReactivity } from "./useReactivity";

// ─────────────────────────────────────────────────────────────────────────────
// BASE CONTRACT HOOKS
// ─────────────────────────────────────────────────────────────────────────────

// ── Action: Initialize Base ───────────────────────────────────────────────────
// Hook:       useInitializeBase()
// SDK Call:   writeContract({ ...BaseContract, functionName: "initializeBase" })
// Parameters: none
// Returns:    { initializeBase: fn, isPending, isSuccess, txHash, error }
// Loading:    yes — shows "Creating your empire..." while tx confirms
// Errors:     "Already initialized" (AlreadyInitialized), RPC errors
export function useInitializeBase() {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const initializeBase = () =>
    writeContract({
      address:      CONTRACT_ADDRESSES.BASE_CONTRACT,
      abi:          BASE_CONTRACT_ABI,
      functionName: "initializeBase",
      gas: 3_000_000n,
      gasPrice: 1_000_000_000n,
      type: 'legacy' as const,
    });

  return { initializeBase, isPending: isPending || isConfirming, isSuccess, txHash, error };
}

// ── Action: Check If Player Has Base ─────────────────────────────────────────
// Hook:       useHasBase(address)
// SDK Call:   readContract("hasBase")
// Parameters: { player: `0x${string}` }
// Returns:    { hasBase: boolean, isLoading }
export function useHasBase(player?: `0x${string}`) {
  const { data, isLoading } = useReadContract({
    address:      CONTRACT_ADDRESSES.BASE_CONTRACT,
    abi:          BASE_CONTRACT_ABI,
    functionName: "hasBase",
    args:         player ? [player] : undefined,
    query:        { enabled: !!player },
  });
  return { hasBase: data as boolean | undefined, isLoading };
}

// ── Action: Get Base Data ─────────────────────────────────────────────────────
// Hook:       useBase(address)
// SDK Call:   readContract("getBase")
// Parameters: { player: `0x${string}` }
// Returns:    { base: BaseData, isLoading, refetch }
export function useBase(player?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address:      CONTRACT_ADDRESSES.BASE_CONTRACT,
    abi:          BASE_CONTRACT_ABI,
    functionName: "getBase",
    args:         player ? [player] : undefined,
    query:        { enabled: !!player, refetchInterval: false },
  });

  const base = React.useMemo(() => {
    if (!data) return undefined;
    return { 
      ...(data as any), 
      id: (data as any).id ?? (player ? BigInt(player) : 0n) 
    } as BaseData;
  }, [data, player]);

  return { base, isLoading, refetch };
}

// ── Action: Get All 100 Buildings ─────────────────────────────────────────────
// Hook:       useAllBuildings(address)
// SDK Call:   readContract("getAllBuildings")
// Parameters: { player: `0x${string}` }
// Returns:    { buildings: BuildingData[100], isLoading }
export function useAllBuildings(player?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address:      CONTRACT_ADDRESSES.BASE_CONTRACT,
    abi:          BASE_CONTRACT_ABI,
    functionName: "getAllBuildings",
    args:         player ? [player] : undefined,
    query:        { enabled: !!player },
  });
  return { buildings: data as BuildingData[] | undefined, isLoading, refetch };
}

// ── Action: Place Building ────────────────────────────────────────────────────
// Hook:       usePlaceBuilding()
// SDK Call:   writeContract("placeBuilding")
// Parameters: { slot: number (0-99), buildingType: number (1-7) }
// Returns:    { placeBuilding: fn, isPending, isSuccess, error }
// Loading:    yes
// Errors:     "Slot occupied" (SlotOccupied), "Invalid slot" (InvalidSlot)
export function usePlaceBuilding() {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const placeBuilding = (slot: number, buildingType: number) =>
    writeContract({
      address:      CONTRACT_ADDRESSES.BASE_CONTRACT,
      abi:          BASE_CONTRACT_ABI,
      functionName: "placeBuilding",
      args:         [slot, buildingType],
      gas: 2_000_000n,
      gasPrice: 1_000_000_000n,
      type: 'legacy' as const,
    });

  return { placeBuilding, isPending: isPending || isConfirming, isSuccess, txHash, error };
}

// ── Action: Start Upgrade ─────────────────────────────────────────────────────
// Hook:       useStartUpgrade()
// SDK Call:   writeContract("startUpgrade")
// Parameters: { slot: number }
// Returns:    { startUpgrade: fn, isPending, isSuccess, error }
// Loading:    yes
// Errors:     "Insufficient resources", "Max level reached", "Already upgrading"
export function useStartUpgrade() {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const startUpgrade = (slot: number) =>
    writeContract({
      address:      CONTRACT_ADDRESSES.BASE_CONTRACT,
      abi:          BASE_CONTRACT_ABI,
      functionName: "startUpgrade",
      args:         [slot],
      gas: 2_000_000n,
      gasPrice: 1_000_000_000n,
      type: 'legacy' as const,
    });

  return { startUpgrade, isPending: isPending || isConfirming, isSuccess, txHash, error };
}

// ── Action: Claim Upgrade ─────────────────────────────────────────────────────
// Hook:       useClaimUpgrade()
// SDK Call:   writeContract("claimUpgrade")
// Parameters: { jobId: bigint }
// Returns:    { claimUpgrade: fn, isPending, isSuccess, error }
export function useClaimUpgrade() {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Action: Claim a completed upgrade job
  const claimUpgrade = (jobId: bigint) =>
    writeContract({
      address:      CONTRACT_ADDRESSES.BASE_CONTRACT,
      abi:          BASE_CONTRACT_ABI,
      functionName: "claimUpgrade",
      args:         [jobId],
      gas: 2_000_000n,
      gasPrice: 1_000_000_000n,
      type: 'legacy' as const,
    });

  return { claimUpgrade, isPending: isPending || isConfirming, isSuccess, txHash, error };
}

// ── Action: Collect Resources ──────────────────────────────────────────────────
// Hook:       useCollectResources()
// SDK Call:   writeContract("collectResources")
// Parameters: none
// Returns:    { collectResources: fn, isPending, isSuccess, error }
// Loading:    yes
// Note:       After tx confirms, Reactivity SDK fires ResourceTick push update
export function useCollectResources() {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const collectResources = () =>
    writeContract({
      address:      CONTRACT_ADDRESSES.BASE_CONTRACT,
      abi:          BASE_CONTRACT_ABI,
      functionName: "collectResources",
      gas: 2_000_000n,
      gasPrice: 1_000_000_000n,
      type: 'legacy' as const,
    });

  return { collectResources, isPending: isPending || isConfirming, isSuccess, txHash, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK CONTRACT HOOKS
// ─────────────────────────────────────────────────────────────────────────────

// ── Action: Launch Attack ─────────────────────────────────────────────────────
// Hook:       useLaunchAttack()
// SDK Call:   writeContract("launchAttack")
// Parameters: { defender: `0x${string}` }
// Returns:    { launchAttack: fn, isPending, isSuccess, error }
// Loading:    yes — shows "Raid incoming!" after tx confirms
// Errors:     "Cannot attack self", "Defender on cooldown", "No base"
// Note:       On confirm, Reactivity pushes AttackLaunched to defender's UI
export function useLaunchAttack() {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const launchAttack = (defender: `0x${string}`) => {
    // Generate random bytes32 for Somnia randomness
    const userRandomness = `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
    
    return writeContract({
      address:      CONTRACT_ADDRESSES.PVP_ARENA,
      abi:          PVP_ARENA_ABI,
      functionName: "issueChallenge",
      args:         [defender, userRandomness],
      gas: 2_000_000n,
      gasPrice: 1_000_000_000n,
      type: 'legacy' as const,
    });
  };

  return { launchAttack, isPending: isPending || isConfirming, isSuccess, txHash, error };
}

// ── Action: Resolve Attack ────────────────────────────────────────────────────
// Hook:       useResolveAttack()
// SDK Call:   writeContract("resolveAttack")
// Parameters: { attackId: bigint }
// Returns:    { resolveAttack: fn, isPending, isSuccess, error }
// Loading:    yes — shows battle animation
// Note:       On confirm, Reactivity pushes AttackResolved to both players
export function useResolveAttack() {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const resolveAttack = (attackId: bigint) =>
    writeContract({
      address:      CONTRACT_ADDRESSES.PVP_ARENA,
      abi:          PVP_ARENA_ABI,
      functionName: "resolveBattle",
      args:         [attackId],
      gas: 2_000_000n,
      gasPrice: 1_000_000_000n,
      type: 'legacy' as const,
    });

  return { resolveAttack, isPending: isPending || isConfirming, isSuccess, txHash, error };
}

// ── Action: Get Win Chance Preview ────────────────────────────────────────────
// Hook:       useWinChance(attacker, defender)
// Returns:    { winChance: number (10-90), isLoading }
// Used in:    Void Assault page — show win % before raiding
export function useWinChance(attacker?: `0x${string}`, defender?: `0x${string}`) {
  const { data, isLoading } = useReadContract({
    address:      CONTRACT_ADDRESSES.PVP_ARENA,
    abi:          PVP_ARENA_ABI,
    functionName: "getWinChance",
    args:         attacker && defender ? [attacker, defender] : undefined,
    query:        { enabled: !!attacker && !!defender },
  });
  return { winChance: data ? Number(data) : undefined, isLoading };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD HOOKS
// ─────────────────────────────────────────────────────────────────────────────

// ── Action: Get Player Stats ──────────────────────────────────────────────────
// Hook:       usePlayerStats(address)
// Returns:    { stats: PlayerStats, isLoading }
export function usePlayerStats(player?: `0x${string}`) {
  const { data, isLoading } = useReadContract({
    address:      CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT,
    abi:          LEADERBOARD_CONTRACT_ABI,
    functionName: "getPlayerStats",
    args:         player ? [player] : undefined,
    query:        { enabled: !!player },
  });
  return { stats: data as PlayerStats | undefined, isLoading };
}

// ── Action: Get Top Players ───────────────────────────────────────────────────
// Hook:       useTopPlayers(count)
// Returns:    { players: address[], wins: number[], isLoading }
// Optimized:  Uses Somnia Data Streams for lightning-fast off-chain ranking.
export function useTopPlayers(count: number = 20) {
  const [players, setPlayers] = useState<{ player: `0x${string}`; wins: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { subscribeToRankingUpdated } = useReactivity();

  useEffect(() => {
    let mounted = true;

    const fetchLeaderboard = async () => {
      try {
        const schemaId = "0x..."; // The schema ID for LeaderboardDataStream
        // Pass the schemaId and the publisher (contract address)
        const data = await streamsClient.streams.getAllPublisherDataForSchema(
          schemaId as `0x${string}`,
          CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT
        );

        if (!mounted || data instanceof Error) {
          if (data instanceof Error) console.error(data);
          return;
        }

        // Process and sort by wins
        // Data format from SDK might be SchemaDecodedItem[][]
        const processed = (data as any[][])
          .map((row: any[]) => {
            // Convert SchemaDecodedItem[] to object
            const obj: any = {};
            row.forEach(item => { obj[item.name] = item.value; });
            return {
              player: obj.player as `0x${string}`,
              wins: Number(obj.wins),
            };
          })
          .sort((a: any, b: any) => b.wins - a.wins);

        setPlayers(processed);
      } catch (err) {
        console.error("Failed to fetch leaderboard from Somnia Streams:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchLeaderboard();

    // Reactivity: refetch instantly when any ranking changes on-chain
    const unsubRanking = subscribeToRankingUpdated(() => {
      fetchLeaderboard();
    });

    const interval = setInterval(fetchLeaderboard, 30000); // Fallback refresh

    return () => {
      mounted = false;
      unsubRanking();
      clearInterval(interval);
    };
  }, [count, subscribeToRankingUpdated]);

  return { players, isLoading, refetch: () => {} };
}

// ─────────────────────────────────────────────────────────────────────────────
// WALLET STATE
// ─────────────────────────────────────────────────────────────────────────────

// Connected wallet address: `0x${string}` — Ethereum hex address (42 chars)
// Balance query: useBalance({ address }) from wagmi
// Transaction status: useWaitForTransactionReceipt({ hash: txHash })
// Network detection: useChainId() — compare to 50312 for Somnia

export function useGameWalletState() {
  const { address, isConnected, chainId } = useAccount();
  const isCorrectNetwork = chainId === 50312;

  return {
    address:          address as `0x${string}` | undefined,
    isConnected,
    isCorrectNetwork,
    shortAddress:     address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
  };
}
