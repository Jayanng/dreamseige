// src/hooks/useReactivity.ts
// ─────────────────────────────────────────────────────────────────────────────
// Somnia Reactivity SDK integration for DreamSiege
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from "react";
import { encodeEventTopics, decodeEventLog } from "viem";
import { CONTRACT_ADDRESSES, BASE_CONTRACT_ABI, PVP_ARENA_ABI, LEADERBOARD_CONTRACT_ABI, RESOURCE_VAULT_ABI } from "../constants/contracts";
import { reactivityClient, publicClient } from "../lib/somniaClients";

// ── Main Hook ─────────────────────────────────────────────────────────────────
export function useReactivity() {
  const unsubsRef = useRef<Array<() => void>>([]);
  const lastPolledBlockRef = useRef<bigint>(0n);

  // Listener Registries for Polling Fallback
  const incomingAttackListeners = useRef<Map<string, (battleId: bigint, attacker: `0x${string}`, atkPower: number, defPower: number) => void>>(new Map());
  const allAttackListeners = useRef<Set<(attackId: bigint, attacker: `0x${string}`, defender: `0x${string}`, atkPower: number, defPower: number) => void>>(new Set());
  const resolutionListeners = useRef<Map<bigint, (winner: `0x${string}`, attackerWon: boolean, lootCredits: bigint, lootBiomass: bigint, lootMinera: bigint) => void>>(new Map());

  // Fallback Polling Logic for fragile RPCs
  useEffect(() => {
    let isMounted = true;
    
    const pollLogs = async () => {
      if (!isMounted) return;
      try {
        const currentBlock = await publicClient.getBlockNumber();
        if (lastPolledBlockRef.current === 0n) {
          lastPolledBlockRef.current = currentBlock - 20n; // Scan last 20 blocks initially
        }

        if (currentBlock > lastPolledBlockRef.current) {
          const fromBlock = lastPolledBlockRef.current + 1n;
          const toBlock = currentBlock;

          const logs = await publicClient.getLogs({
            address: CONTRACT_ADDRESSES.PVP_ARENA,
            fromBlock,
            toBlock
          });

          console.log(`[Polling] Blocks ${fromBlock}-${toBlock} scanned. Logs: ${logs.length}`);


          if (logs.length > 0) {
            logs.forEach(log => {
              try {
                // Topic 0 for ChallengeIssued
                if (log.topics[0] === encodeEventTopics({ abi: PVP_ARENA_ABI, eventName: "ChallengeIssued" })[0]) {
                  const decoded = decodeEventLog({ abi: PVP_ARENA_ABI, data: log.data, topics: log.topics });
                  const { battleId, attacker, defender, attackerPower, defenderPower } = (decoded.args as any);
                  


                  // Trigger "All Attacks" listeners
                  allAttackListeners.current.forEach(cb => cb(BigInt(battleId), attacker, defender, Number(attackerPower), Number(defenderPower)));
                  
                  // Trigger "Incoming" listener for the specific defender
                  const defenderSub = incomingAttackListeners.current.get(defender.toLowerCase());
                  if (defenderSub) defenderSub(BigInt(battleId), attacker, Number(attackerPower), Number(defenderPower));
                }

                // Topic 0 for BattleResolved
                if (log.topics[0] === encodeEventTopics({ abi: PVP_ARENA_ABI, eventName: "BattleResolved" })[0]) {
                  const decoded = decodeEventLog({ abi: PVP_ARENA_ABI, data: log.data, topics: log.topics });
                  const { battleId, winner, attackerWon, creditsLooted, biomassLooted, mineraLooted } = (decoded.args as any);



                  const resSub = resolutionListeners.current.get(BigInt(battleId));
                  if (resSub) resSub(winner, attackerWon, BigInt(creditsLooted), BigInt(biomassLooted), BigInt(mineraLooted));
                }
              } catch (e) {

              }
            });
          }
          lastPolledBlockRef.current = currentBlock;
        }
      } catch (err) {

      }
      setTimeout(pollLogs, 4000); // Poll every 4s
    };

    pollLogs();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    return () => {
      // NOTE: unsubscribing from Somnia SDK is async, but we can't easily wait here.
      // We'll store the unsub functions.
      unsubsRef.current.forEach(unsub => unsub());
      unsubsRef.current = [];
    };
  }, []);

  const getReactivityProvider = useCallback(() => {
    return reactivityClient;
  }, []);

  const safeSubscribe = useCallback(async (params: any, onUnsub: (unsub: () => void) => void) => {
    try {
      const provider = getReactivityProvider();
      const result = await provider.subscribe(params);
      
      if (result instanceof Error) {

        return;
      }

      const unsub = () => {
        result.unsubscribe();
      };
      
      onUnsub(unsub);
      return unsub;
    } catch (err) {

    }
  }, [getReactivityProvider]);

  // ── Subscribe to ResourceUpdated events for a specific player ────────────
  const subscribeToResourceTick = useCallback((
    player:   `0x${string}`,
    callback: (gold: bigint, wood: bigint, stone: bigint, vanguard: bigint, timestamp: number) => void
  ) => {
    const params = {
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.RESOURCE_VAULT],
      topicOverrides: encodeEventTopics({
        abi: RESOURCE_VAULT_ABI,
        eventName: "ResourceUpdated",
        args: { player },
      }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({
            abi: RESOURCE_VAULT_ABI,
            data: data.result.data,
            topics: data.result.topics,
          });
          const args = log.args as any;
          callback(BigInt(args.credits), BigInt(args.biomass), BigInt(args.minera), BigInt(args.vanguard), Number(args.timestamp));
        } catch (e) {

        }
      }
    };

    let unsub: (() => void) | undefined;
    safeSubscribe(params, (u) => {
      unsub = u;
      unsubsRef.current.push(u);
    });

    return () => {
      if (unsub) {
        unsub();
        unsubsRef.current = unsubsRef.current.filter(item => item !== unsub);
      }
    };
  }, [safeSubscribe]);

  // ── Subscribe to UpgradeComplete events ───────────────────────────────────
  const subscribeToUpgradeComplete = useCallback((
    baseId:   bigint,
    callback: (slot: number, newLevel: number, jobId: bigint) => void
  ) => {
    const params = {
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.BASE_CONTRACT],
      topicOverrides: encodeEventTopics({
        abi: BASE_CONTRACT_ABI,
        eventName: "UpgradeComplete",
        args: { baseId },
      }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({
            abi: BASE_CONTRACT_ABI,
            data: data.result.data,
            topics: data.result.topics,
          });
          const args = log.args as any;
          callback(Number(args.slot), Number(args.newLevel), BigInt(args.jobId));
        } catch (e) {

        }
      }
    };

    let unsub: (() => void) | undefined;
    safeSubscribe(params, (u) => {
      unsub = u;
      unsubsRef.current.push(u);
    });

    return () => {
      if (unsub) {
        unsub();
        unsubsRef.current = unsubsRef.current.filter(item => item !== unsub);
      }
    };
  }, [safeSubscribe]);

  // ── Subscribe to BuildingPlaced events ────────────────────────────────────
  const subscribeToBuildingPlaced = useCallback((
    baseId:   bigint,
    callback: (slot: number, buildingType: number) => void
  ) => {
    const params = {
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.BASE_CONTRACT],
      topicOverrides: encodeEventTopics({
        abi: BASE_CONTRACT_ABI,
        eventName: "BuildingPlaced",
        args: { baseId },
      }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({
            abi: BASE_CONTRACT_ABI,
            data: data.result.data,
            topics: data.result.topics,
          });
          const args = log.args as any;
          callback(Number(args.slot), Number(args.buildingType));
        } catch (e) {

        }
      }
    };

    let unsub: (() => void) | undefined;
    safeSubscribe(params, (u) => {
      unsub = u;
      unsubsRef.current.push(u);
    });

    return () => {
      if (unsub) {
        unsub();
        unsubsRef.current = unsubsRef.current.filter(item => item !== unsub);
      }
    };
  }, [safeSubscribe]);

  // ── Subscribe to UpgradeStarted events (captures jobId per slot) ──────────
  const subscribeToUpgradeStarted = useCallback((
    baseId:   bigint,
    callback: (slot: number, newLevel: number, endsAt: number, jobId: bigint) => void
  ) => {
    const params = {
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.BASE_CONTRACT],
      topicOverrides: encodeEventTopics({
        abi: BASE_CONTRACT_ABI,
        eventName: "UpgradeStarted",
        args: { baseId },
      }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({
            abi: BASE_CONTRACT_ABI,
            data: data.result.data,
            topics: data.result.topics,
          });
          const args = log.args as any;
          callback(Number(args.slot), Number(args.newLevel), Number(args.endsAt), BigInt(args.jobId));
        } catch (e) {

        }
      }
    };

    let unsub: (() => void) | undefined;
    safeSubscribe(params, (u) => {
      unsub = u;
      unsubsRef.current.push(u);
    });

    return () => {
      if (unsub) {
        unsub();
        unsubsRef.current = unsubsRef.current.filter(item => item !== unsub);
      }
    };
  }, [safeSubscribe]);

  // ── Subscribe to ChallengeIssued events (for defenders) ───────────────────
  const subscribeToIncomingAttack = useCallback((
    defenderAddress: `0x${string}`,
    callback: (battleId: bigint, attacker: `0x${string}`, atkPower: number, defPower: number) => void
  ) => {
    const params = {

      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.PVP_ARENA],
      topicOverrides: encodeEventTopics({
        abi: PVP_ARENA_ABI,
        eventName: "ChallengeIssued",
        args: { defender: defenderAddress },
      }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({
            abi: PVP_ARENA_ABI,
            data: data.result.data,
            topics: data.result.topics,
          });
          const args = log.args as any;
          callback(BigInt(args.battleId), args.attacker as `0x${string}`, Number(args.attackerPower), Number(args.defenderPower));
        } catch (e) {

        }
      }
    };

    let unsub: (() => void) | undefined;

    // Register for polling fallback
    incomingAttackListeners.current.set(defenderAddress.toLowerCase(), callback);

    safeSubscribe(params, (u) => {
      unsub = u;
      unsubsRef.current.push(u);
    });

    return () => {
      incomingAttackListeners.current.delete(defenderAddress.toLowerCase());
      if (unsub) {
        unsub();
        unsubsRef.current = unsubsRef.current.filter(item => item !== unsub);
      }
    };
  }, [safeSubscribe]);

  // ── Subscribe to BattleResolved events ────────────────────────────────────
  const subscribeToAttackResolved = useCallback((
    battleId: bigint,
    callback: (
      winner:      `0x${string}`,
      attackerWon: boolean,
      lootCredits: bigint,
      lootBiomass: bigint,
      lootMinera:  bigint
    ) => void
  ) => {
    const params = {
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.PVP_ARENA],
      topicOverrides: encodeEventTopics({
        abi: PVP_ARENA_ABI,
        eventName: "BattleResolved",
        args: { battleId },
      }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({
            abi: PVP_ARENA_ABI,
            data: data.result.data,
            topics: data.result.topics,
          });
          const args = log.args as any;
          callback(
            args.winner as `0x${string}`,
            args.attackerWon,
            BigInt(args.creditsLooted),
            BigInt(args.biomassLooted),
            BigInt(args.mineraLooted)
          );
        } catch (e) {

        }
      }
    };

    let unsub: (() => void) | undefined;

    // Register for polling fallback
    resolutionListeners.current.set(battleId, callback);

    safeSubscribe(params, (u) => {
      unsub = u;
      unsubsRef.current.push(u);
    });

    return () => {
      resolutionListeners.current.delete(battleId);
      if (unsub) {
        unsub();
        unsubsRef.current = unsubsRef.current.filter(item => item !== unsub);
      }
    };
  }, [safeSubscribe]);

  // ── Subscribe to Leaderboard RankingUpdated events ────────────────────────
  const subscribeToRankingUpdated = useCallback((
    callback: (player: `0x${string}`, newRank: number, totalWins: number) => void
  ) => {
    const params = {
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT],
      topicOverrides: encodeEventTopics({
        abi: LEADERBOARD_CONTRACT_ABI,
        eventName: "RankingUpdated",
      }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({
            abi: LEADERBOARD_CONTRACT_ABI,
            data: data.result.data,
            topics: data.result.topics,
          });
          const args = log.args as any;
          callback(args.player as `0x${string}`, Number(args.newRank), Number(args.totalWins));
        } catch (e) {

        }
      }
    };

    let unsub: (() => void) | undefined;
    safeSubscribe(params, (u) => {
      unsub = u;
      unsubsRef.current.push(u);
    });

    return () => {
      if (unsub) {
        unsub();
        unsubsRef.current = unsubsRef.current.filter(item => item !== unsub);
      }
    };
  }, [safeSubscribe]);

  // ── Subscribe to EVERYTHING: Global Streams ───────────────────────────────
  
  const subscribeToAllAttacks = useCallback((
    callback: (attackId: bigint, attacker: `0x${string}`, defender: `0x${string}`, atkPower: number, defPower: number) => void
  ) => {
    const params = {
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.PVP_ARENA],
      topicOverrides: encodeEventTopics({
        abi: PVP_ARENA_ABI,
        eventName: "ChallengeIssued",
      }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({
            abi: PVP_ARENA_ABI,
            data: data.result.data,
            topics: data.result.topics,
          });
          const args = log.args as any;
          callback(
            BigInt(args.battleId),
            args.attacker as `0x${string}`,
            args.defender as `0x${string}`,
            Number(args.attackerPower),
            Number(args.defenderPower)
          );
        } catch (e) {

        }
      }
    };

    let unsub: (() => void) | undefined;

    // Register for polling fallback
    allAttackListeners.current.add(callback);

    safeSubscribe(params, (u) => {
      unsub = u;
      unsubsRef.current.push(u);
    });

    return () => {
      allAttackListeners.current.delete(callback);
      if (unsub) {
        unsub();
        unsubsRef.current = unsubsRef.current.filter(item => item !== unsub);
      }
    };
  }, [safeSubscribe]);

  const subscribeToAllResolutions = useCallback((
    callback: (
      battleId: bigint, 
      winner: `0x${string}`, 
      loser: `0x${string}`,
      attackerWon: boolean,
      credits: bigint,
      biomass: bigint,
      minera: bigint,
      winnerEmpire: string,
      loserEmpire: string,
      txHash: string,
      blockNumber: number
    ) => void
  ) => {
    const params = {
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.PVP_ARENA],
      topicOverrides: encodeEventTopics({
        abi: PVP_ARENA_ABI,
        eventName: "BattleResolved",
      }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({
            abi: PVP_ARENA_ABI,
            data: data.result.data,
            topics: data.result.topics,
          });
          const args = log.args as any;
          callback(
            BigInt(args.battleId), 
            args.winner as `0x${string}`, 
            args.loser as `0x${string}`,
            args.attackerWon,
            BigInt(args.creditsLooted),
            BigInt(args.biomassLooted),
            BigInt(args.mineraLooted),
            args.winnerEmpire,
            args.loserEmpire,
            data.result.transactionHash,
            Number(data.result.blockNumber)
          );
        } catch (e) {

        }
      }
    };

    let unsub: (() => void) | undefined;
    safeSubscribe(params, (u) => {
      unsub = u;
      unsubsRef.current.push(u);
    });

    return () => {
      if (unsub) {
        unsub();
        unsubsRef.current = unsubsRef.current.filter(item => item !== unsub);
      }
    };
  }, [safeSubscribe]);


  // ── Subscribe to ResourcesCollected events for a specific player ────────────
  const subscribeToResourcesCollected = useCallback((
    player:   `0x${string}`,
    callback: (gold: bigint, wood: bigint, stone: bigint) => void
  ) => {
    const params = {
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.BASE_CONTRACT],
      topicOverrides: encodeEventTopics({
        abi: BASE_CONTRACT_ABI,
        eventName: "ResourcesCollected",
        args: { collector: player },
      }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({
            abi: BASE_CONTRACT_ABI,
            data: data.result.data,
            topics: data.result.topics,
          });
          const args = log.args as any;
          callback(BigInt(args.gold), BigInt(args.wood), BigInt(args.stone));
        } catch (e) {

        }
      }
    };

    let unsub: (() => void) | undefined;
    safeSubscribe(params, (u) => {
      unsub = u;
      unsubsRef.current.push(u);
    });

    return () => {
      if (unsub) {
        unsub();
        unsubsRef.current = unsubsRef.current.filter(item => item !== unsub);
      }
    };
  }, [safeSubscribe]);

  // ── Subscribe to GlobalBattleEvent events (for the marquee) ────────────────
  const subscribeToGlobalBattleEvents = useCallback((
    callback: (battleId: bigint, attackerEmpire: string, defenderEmpire: string, attackerWon: boolean, totalLoot: bigint, timestamp: number) => void
  ) => {
    const params = {
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.PVP_ARENA],
      topicOverrides: encodeEventTopics({
        abi: PVP_ARENA_ABI,
        eventName: "GlobalBattleEvent",
      }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({
            abi: PVP_ARENA_ABI,
            data: data.result.data,
            topics: data.result.topics,
          });
          const args = log.args as any;
          callback(
            BigInt(args.battleId),
            args.attackerEmpire,
            args.defenderEmpire,
            args.attackerWon,
            BigInt(args.totalLoot),
            Number(args.timestamp)
          );
        } catch (e) {

        }
      }
    };

    let unsub: (() => void) | undefined;
    safeSubscribe(params, (u) => {
      unsub = u;
      unsubsRef.current.push(u);
    });

    return () => {
      if (unsub) {
        unsub();
        unsubsRef.current = unsubsRef.current.filter(item => item !== unsub);
      }
    };
  }, [safeSubscribe]);

  // ── Subscribe to ALL Activity (for Online Status Pulse) ────────────────
  const subscribeToAllActivity = useCallback((
    callback: (actor: `0x${string}`) => void
  ) => {
    const unsubs: Array<() => void> = [];

    // 1. ResourcesCollected (BaseContract)
    safeSubscribe({
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.BASE_CONTRACT],
      topicOverrides: encodeEventTopics({ abi: BASE_CONTRACT_ABI, eventName: "ResourcesCollected" }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({ abi: BASE_CONTRACT_ABI, data: data.result.data, topics: data.result.topics });
          callback((log.args as any).collector);
        } catch (e) {}
      }
    }, (u) => { unsubs.push(u); unsubsRef.current.push(u); });

    // 2. ChallengeIssued (PvPArena)
    safeSubscribe({
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.PVP_ARENA],
      topicOverrides: encodeEventTopics({ abi: PVP_ARENA_ABI, eventName: "ChallengeIssued" }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({ abi: PVP_ARENA_ABI, data: data.result.data, topics: data.result.topics });
          callback((log.args as any).attacker);
        } catch (e) {}
      }
    }, (u) => { unsubs.push(u); unsubsRef.current.push(u); });

    // 3. BattleResolved (PvPArena) - winner and loser are active
    safeSubscribe({
      ethCalls: [],
      eventContractSources: [CONTRACT_ADDRESSES.PVP_ARENA],
      topicOverrides: encodeEventTopics({ abi: PVP_ARENA_ABI, eventName: "BattleResolved" }),
      onData: (data: any) => {
        try {
          const log = decodeEventLog({ abi: PVP_ARENA_ABI, data: data.result.data, topics: data.result.topics });
          const args = log.args as any;
          callback(args.winner);
          callback(args.loser);
        } catch (e) {}
      }
    }, (u) => { unsubs.push(u); unsubsRef.current.push(u); });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [safeSubscribe]);

  return {
    subscribeToResourceTick,
    subscribeToUpgradeComplete,
    subscribeToUpgradeStarted,
    subscribeToBuildingPlaced,
    subscribeToIncomingAttack,
    subscribeToAttackResolved,
    subscribeToRankingUpdated,
    subscribeToAllAttacks,
    subscribeToAllResolutions,
    subscribeToResourcesCollected,
    subscribeToGlobalBattleEvents,
    subscribeToAllActivity,
  };
}
