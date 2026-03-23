import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CONTRACT_ADDRESSES, PVP_ARENA_ABI, LEADERBOARD_CONTRACT_ABI, BASE_CONTRACT_ABI, RESOURCE_VAULT_ABI } from '../constants/contracts';
import { useReactivity } from '../hooks/useReactivity';
import { toHex, encodeEventTopics, decodeEventLog } from 'viem';
import { publicClient } from '../lib/somniaClients';
import { Shield, ShieldAlert, Trophy, Skull, Crosshair, Target, Activity, RefreshCw } from 'lucide-react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';


export default function Siege() {
  const { address } = useAccount();
  const location = useLocation();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedTargetData, setSelectedTargetData] = useState<any>(null);
  const [troopDeployment, setTroopDeployment] = useState(75);
  const [battleResult, setBattleResult] = useState<any>(null);
  const [activeBattleId, setActiveBattleId] = useState<bigint | null>(null);
  const [incomingAttacker, setIncomingAttacker] = useState<string | null>(null);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [attackerVanguard, setAttackerVanguard] = useState<number | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [manualTargets, setManualTargets] = useState<any[]>([]);
  const autoResolveTriggered = useRef(false);

  const { writeContract: launchSiege, data: siegeHash, isPending: siegePending } = useWriteContract();
  const { isLoading: siegeConfirming, isSuccess: siegeConfirmed } = useWaitForTransactionReceipt({ hash: siegeHash });

  const { writeContract: interceptRaid, isPending: interceptPending, data: interceptHash } = useWriteContract();
  const { writeContract: resolveRaid, isPending: resolvePending, data: resolveHash } = useWriteContract();

  const { data: attackerVaultData } = useReadContract({
    address: CONTRACT_ADDRESSES.RESOURCE_VAULT,
    abi: RESOURCE_VAULT_ABI,
    functionName: 'vaults',
    args: [incomingAttacker as `0x${string}`],
    query: { enabled: !!incomingAttacker }
  });

  const { data: myBaseData } = useReadContract({
    address: CONTRACT_ADDRESSES.BASE_CONTRACT,
    abi: BASE_CONTRACT_ABI,
    functionName: 'getBase',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });

  const { data: myVaultData } = useReadContract({
    address: CONTRACT_ADDRESSES.RESOURCE_VAULT,
    abi: RESOURCE_VAULT_ABI,
    functionName: 'vaults',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });

  const { data: myBuildingsData } = useReadContract({
    address: CONTRACT_ADDRESSES.BASE_CONTRACT,
    abi: BASE_CONTRACT_ABI,
    functionName: 'getAllBuildings',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });

  const { data: cooldownData, refetch: refetchCooldown } = useReadContract({
    address: CONTRACT_ADDRESSES.PVP_ARENA,
    abi: PVP_ARENA_ABI,
    functionName: 'isOnCooldown',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });

  useEffect(() => {
    if (attackerVaultData) {
      const vanguard = Array.isArray(attackerVaultData) ? attackerVaultData[3] : (attackerVaultData as any).vanguard;
      setAttackerVanguard(vanguard !== undefined ? Number(vanguard) : null);
    } else {
      setAttackerVanguard(null);
    }
  }, [attackerVaultData]);

  const { subscribeToIncomingAttack, subscribeToAttackResolved, subscribeToAllActivity, subscribeToAllAttacks } = useReactivity();

  // Presence State: { address -> lastActivityTimestamp }
  const [onlineStatus, setOnlineStatus] = useState<Record<string, number>>({});

  // Reactivity Subscriptions
  useEffect(() => {
    if (!address) return;



    // 1. Listen for global player activity (Online Pulse)
    const unsubActivity = subscribeToAllActivity((actor) => {
      if (!actor) return;

      setOnlineStatus(prev => ({
        ...prev,
        [actor.toLowerCase()]: Math.floor(Date.now() / 1000)
      }));
    });

    // 2. Listen for challenges issued to ME
    const unsubIssued = subscribeToIncomingAttack(address, (battleId, attacker, atkPower, defPower) => {

      setActiveBattleId(battleId);
      setIncomingAttacker(attacker);
      setEtaSeconds(180);
    });

    // 3. Listen for my OUTGOING attacks
    const unsubAllAttacks = subscribeToAllAttacks((attackId, attacker, defender, atkPower, defPower) => {
      if (attacker.toLowerCase() === address.toLowerCase()) {

        setActiveBattleId(attackId);
        setIncomingAttacker(null);
        setEtaSeconds(180);
      }
    });

    return () => {
      unsubActivity();
      unsubIssued();
      unsubAllAttacks();
    };
  }, [address, subscribeToIncomingAttack, subscribeToAllActivity, subscribeToAllAttacks]);

  // Secondary Effect for Battle Resolution (once we have an activeBattleId)
  useEffect(() => {
    if (!address || !activeBattleId) return;

    const unsubResolved = subscribeToAttackResolved(activeBattleId, (winner, attackerWon, lootCredits) => {
      const isWinner = winner.toLowerCase() === address.toLowerCase();
      // Resolve opponent name: if we are the defender, opponent is incomingAttacker; otherwise use selectedTarget
      const opponentName = incomingAttacker || selectedTarget || "Opponent";

      // Only set if no other path has already set the result (functional update guards against stale closure)
      // Log writing is handled by GameContext's subscribeToAllResolutions which has the real txHash.
      setBattleResult((prev: any) => prev !== null ? prev : {
        won: isWinner,
        loot: Number(lootCredits),
        target: opponentName
      });
      // State cleanup is intentionally left to the Continue button so this subscription
      // stays alive long enough for both players to receive the push reliably.
    });

    return () => unsubResolved();
  }, [address, activeBattleId, incomingAttacker, selectedTarget, subscribeToAttackResolved]);

  useEffect(() => {
    const state = location.state as any;
    if (state?.immediateResult) {
      setBattleResult(state.immediateResult);
      window.history.replaceState({}, '');
    }
    if (state?.targetAddress) {
      const addr = state.targetAddress;
      setManualTargets(prev => {
        const already = prev.find(t => t.address.toLowerCase() === addr.toLowerCase());
        if (already) return prev;
        return [...prev, {
          address: addr,
          name: addr.slice(0, 6) + '...' + addr.slice(-4),
          wins: 0,
          loot: '10',
          def: 50,
          winChance: 50,
          isOnline: false
        }];
      });
    }
  }, [location.state]);

  useEffect(() => {
    if (etaSeconds <= 0) return;
    const timer = setInterval(() => {
      setEtaSeconds(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [etaSeconds]);

  const formatEta = (seconds: number) => {
    if (seconds <= 0) return 'READY';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `00:${m}:${s}`;
  };

  // --- PHASE 7: ATOMIC SYNC & RECOVERY ---

  // 1. Recover Active Battle on Mount/Address Change
  const { data: activeBattleData, refetch: refetchActiveBattle } = useReadContract({
    address: CONTRACT_ADDRESSES.PVP_ARENA,
    abi: PVP_ARENA_ABI,
    functionName: 'getActiveBattleForAttacker',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });

  useEffect(() => {
    if (activeBattleData &&
      (activeBattleData as any).id > 0n &&
      ((activeBattleData as any).status === 0 ||
        (activeBattleData as any).status === 1)) {
      const battle = activeBattleData as any;
      const currentTime = Math.floor(Date.now() / 1000);
      const battleAge = currentTime - Number(battle.createdAt);
      if (battleAge >= 180) return; // Battle too old, skip recovery

      console.log("[Phase 7] Recovered active battle (Attacker):", battle.id.toString());
      setActiveBattleId(battle.id);
      setIncomingAttacker(null);

      // Calculate remaining time
      const expiresAt = Number(battle.createdAt) + 180; // Assuming 3 min expiry
      const remaining = expiresAt - currentTime;
      setEtaSeconds(remaining > 0 ? remaining : 0);
    }
  }, [activeBattleData]);

  // 1b. Recover Active Battle for DEFENDER
  const { data: activeDefenderData } = useReadContract({
    address: CONTRACT_ADDRESSES.PVP_ARENA,
    abi: PVP_ARENA_ABI,
    functionName: 'getActiveBattleForDefender',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });

  useEffect(() => {
    if (activeDefenderData &&
      (activeDefenderData as any).id > 0n &&
      ((activeDefenderData as any).status === 0 ||
        (activeDefenderData as any).status === 1)) {
      const battle = activeDefenderData as any;
      const currentTime = Math.floor(Date.now() / 1000);
      const battleAge = currentTime - Number(battle.createdAt);
      if (battleAge >= 180) return; // Battle too old, skip recovery

      console.log("[Phase 7] Recovered raid as defender! battleId:", battle.id.toString());
      setActiveBattleId(battle.id);
      setIncomingAttacker(battle.attacker);

      const expiresAt = Number(battle.createdAt) + 180;
      const remaining = expiresAt - currentTime;
      setEtaSeconds(remaining > 0 ? remaining : 0);
    }
  }, [activeDefenderData]);

  // 2. Direct Receipt Parsing for instantaneous confirmation
  useEffect(() => {
    if (siegeHash && siegeConfirmed) {
      const processReceipt = async () => {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: siegeHash });


          // Manually search for ChallengeIssued in the receipt logs
          const challengeTopic = encodeEventTopics({ abi: PVP_ARENA_ABI, eventName: "ChallengeIssued" })[0];
          const log = receipt.logs.find(l => l.topics[0] === challengeTopic);

          if (log) {
            const decoded = decodeEventLog({ abi: PVP_ARENA_ABI, data: log.data, topics: log.topics });
            const { battleId, attacker } = (decoded.args as any);
            if (battleId > 0n && attacker.toLowerCase() === address?.toLowerCase()) {
              console.log("[Phase 7] Challenge issued successfully! ID:", battleId.toString());
              setActiveBattleId(battleId);
              setEtaSeconds(180);
              setIncomingAttacker(null);
            }
          }
        } catch (e) {
          console.error("[Phase 7] Receipt parsing failed:", e);
        }
      };
      processReceipt();
    }
  }, [siegeHash, siegeConfirmed]);

  // 3. Resolve Receipt Parsing
  useEffect(() => {
    if (!resolveHash) return;
    const processResolveReceipt = async () => {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: resolveHash
        });
        console.log("[Phase 7] Resolve confirmed, parsing logs...");
        console.log("[Phase 7] All logs in receipt:", receipt.logs.map(l => ({ address: l.address, topic0: l.topics[0] })));
        const resolvedTopic = encodeEventTopics({
          abi: PVP_ARENA_ABI,
          eventName: "BattleResolved"
        })[0];

        const log = receipt.logs.find(l => l.topics[0] === resolvedTopic);
        if (log) {
          const decoded = decodeEventLog({
            abi: PVP_ARENA_ABI,
            data: log.data,
            topics: log.topics
          });
          const { winner, attackerWon, creditsLooted } = decoded.args as any;
          const args = decoded.args as any;
          console.log("[Phase 7] Battle resolved! winner:", winner);
          const isWinner = winner.toLowerCase() === address?.toLowerCase();
          setBattleResult({
            won: isWinner,
            loot: Number(creditsLooted),
            target: selectedTarget || "Opponent"
          });

          // Enrich existing log entry with real txHash
          try {
            const key = `battleLogs_${address?.toLowerCase()}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const enriched = existing.map((l: any) =>
              l.id === activeBattleId?.toString()
                ? { ...l, txHash: receipt.transactionHash, txLink: `https://shannon-explorer.somnia.network/tx/${receipt.transactionHash}` }
                : l
            );
            localStorage.setItem(key, JSON.stringify(enriched));
            window.dispatchEvent(new StorageEvent('storage', { key }));
          } catch (e) {}

          setActiveBattleId(null);
          setIncomingAttacker(null);
          setEtaSeconds(0);
          autoResolveTriggered.current = false;
        }
      } catch (e) {
        console.error("[Phase 7] Resolve receipt parsing failed:", e);
      }
    };
    processResolveReceipt();
  }, [resolveHash]);

  useEffect(() => {
    if (!interceptHash) return;
    const processInterceptReceipt = async () => {
      try {

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: interceptHash
        });

        console.log("[Phase 7] Intercept confirmed, parsing logs...");

        // Look for BattleResolved event (emitted in all intercept outcomes)
        const resolvedTopic = encodeEventTopics({
          abi: PVP_ARENA_ABI,
          eventName: "BattleResolved"
        })[0];

        const log = receipt.logs.find(l => l.topics[0] === resolvedTopic);
        if (log) {
          const decoded = decodeEventLog({
            abi: PVP_ARENA_ABI,
            data: log.data,
            topics: log.topics
          });
          const { winner, attackerWon, creditsLooted } = decoded.args as any;
          const args = decoded.args as any;
          console.log("[Phase 7] Intercept resolved! winner:", winner);

          const isWinner = winner.toLowerCase() === address?.toLowerCase();
          setBattleResult({
            won: isWinner,
            loot: Number(creditsLooted),
            target: isWinner
              ? (incomingAttacker || "Attacker")
              : (selectedTarget || "Opponent")
          });

          // Enrich existing log entry with real txHash
          try {
            const key = `battleLogs_${address?.toLowerCase()}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const enriched = existing.map((l: any) =>
              l.id === activeBattleId?.toString()
                ? { ...l, txHash: receipt.transactionHash, txLink: `https://shannon-explorer.somnia.network/tx/${receipt.transactionHash}` }
                : l
            );
            localStorage.setItem(key, JSON.stringify(enriched));
            window.dispatchEvent(new StorageEvent('storage', { key }));
          } catch (e) {}

          setActiveBattleId(null);
          setIncomingAttacker(null);
          setEtaSeconds(0);
        }
      } catch (e) {
        console.error("[Phase 7] Intercept receipt parsing failed:", e);
      }
    };
    processInterceptReceipt();
  }, [interceptHash]);

  useEffect(() => {

  }, [interceptHash]);

  // 3.5. Defender Fallback Polling (detects if battle resolves without defender action)
  useEffect(() => {
    if (!activeBattleId || !incomingAttacker) return;

    const saveDefenderLog = async () => {
      try {
        const battle = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.PVP_ARENA,
          abi: PVP_ARENA_ABI,
          functionName: 'getBattle',
          args: [activeBattleId]
        }) as any;

        // Handle expired battle: time ran out but battle was never resolved on-chain
        if (battle.status !== 2 && battle.status !== 3) {
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = Number(battle.createdAt) + 180;
          if (now > expiresAt) {
            setBattleResult({ won: false, loot: 0, target: 'expired' });
            setActiveBattleId(null);
            setIncomingAttacker(null);
            setEtaSeconds(0);
            autoResolveTriggered.current = false;
          }
          return;
        }

        const isWinner = battle.status === 3
          ? address?.toLowerCase() === battle.defender?.toLowerCase()
          : (battle.defender?.toLowerCase() === address?.toLowerCase()
              ? !battle.attackerWon
              : battle.attackerWon && battle.attacker?.toLowerCase() === address?.toLowerCase());

        const opponent = address?.toLowerCase() === battle.defender?.toLowerCase()
          ? (battle.attackerEmpire || battle.attacker?.slice(0,6) + '...' + battle.attacker?.slice(-4))
          : (battle.defenderEmpire || battle.defender?.slice(0,6) + '...' + battle.defender?.slice(-4));

        // Show battle result modal for the defender
        setBattleResult((prev: any) => prev !== null ? prev : {
          won: isWinner,
          loot: battle.status === 3 ? 0 : (isWinner ? Number(battle.lootCredits || 0) : 0),
          target: opponent
        });

        setActiveBattleId(null);
        setIncomingAttacker(null);
        setEtaSeconds(0);
        autoResolveTriggered.current = false;
      } catch (e) {}
    };

    const interval = setInterval(saveDefenderLog, 1000);
    return () => clearInterval(interval);
  }, [activeBattleId, incomingAttacker, address]);

  // 4. Attacker Fallback Polling (detects if defender intercepts while we are waiting)
  useEffect(() => {
    if (!activeBattleId) return;

    const checkBattleResolved = async () => {
      if (!activeBattleId) return;
      try {
        const battle = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.PVP_ARENA,
          abi: PVP_ARENA_ABI,
          functionName: 'getBattle',
          args: [activeBattleId]
        }) as any;

        if (battle.status === 2) {
          // RESOLVED
          const isWinner =
            (battle.attackerWon && battle.attacker?.toLowerCase() === address?.toLowerCase()) ||
            (!battle.attackerWon && battle.defender?.toLowerCase() === address?.toLowerCase());
          console.log("[Phase 7] Polling: Battle RESOLVED on-chain", { battleId: activeBattleId.toString(), isWinner });
          setBattleResult((prev: any) => prev !== null ? prev : {
            won: isWinner,
            loot: Number(battle.lootCredits),
            target: selectedTarget || "Opponent"
          });

          setActiveBattleId(null);
          setIncomingAttacker(null);
          setEtaSeconds(0);
          autoResolveTriggered.current = false;
        } else if (battle.status === 3) {
          // INTERCEPTED - attacker lost
          console.log("[Phase 7] Polling: Battle INTERCEPTED on-chain", { battleId: activeBattleId.toString() });
          const isWinner = battle.defender?.toLowerCase() === address?.toLowerCase();
          const opponent = address?.toLowerCase() === battle.attacker?.toLowerCase()
            ? (battle.defenderEmpire || battle.defender?.slice(0,6) + '...' + battle.defender?.slice(-4))
            : (battle.attackerEmpire || battle.attacker?.slice(0,6) + '...' + battle.attacker?.slice(-4));

          setBattleResult((prev: any) => prev !== null ? prev : {
            won: isWinner,
            loot: 0,
            target: opponent
          });

          setActiveBattleId(null);
          setIncomingAttacker(null);
          setEtaSeconds(0);
          autoResolveTriggered.current = false;
        }
      } catch (e) {

      }
    };

    const interval = setInterval(checkBattleResolved, 1000);
    return () => clearInterval(interval);
  }, [activeBattleId, incomingAttacker, address, selectedTarget]);

  // 4. Auto-Resolve Polling (based on on-chain time)
  useEffect(() => {
    if (!activeBattleId || incomingAttacker !== null) return;
    if (autoResolveTriggered.current) return;

    const checkAndAutoResolve = async () => {
      try {
        const battle = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.PVP_ARENA,
          abi: PVP_ARENA_ABI,
          functionName: 'getBattle',
          args: [activeBattleId]
        }) as any;

        if (battle.id === 0n) return;
        if (battle.status !== 0 && battle.status !== 1) return;

        const now = Math.floor(Date.now() / 1000);
        const createdAt = Number(battle.createdAt);
        const expiresAt = createdAt + 180;
        const timeLeft = expiresAt - now;

        console.log("[AutoResolve] Time left on-chain:", timeLeft, "seconds");

        if (timeLeft <= 0) {
          // Already expired, clear state
          console.log("[AutoResolve] Battle already expired, clearing state");
          setBattleResult({
            won: false,
            loot: 0,
            target: 'expired'
          });
          setActiveBattleId(null);
          setIncomingAttacker(null);
          setEtaSeconds(0);
          autoResolveTriggered.current = false;
          return;
        }

        if (timeLeft <= 60 && !autoResolveTriggered.current) {
          console.log("[AutoResolve] Firing resolve with", timeLeft, "seconds left");
          autoResolveTriggered.current = true;
          resolveRaid({
            address: CONTRACT_ADDRESSES.PVP_ARENA,
            abi: PVP_ARENA_ABI,
            functionName: 'resolveBattle',
            args: [activeBattleId],
            gas: 3_000_000n,
            gasPrice: 1_000_000_000n,
            type: 'legacy' as const,
          });
        }
      } catch (e) {
        console.error("[AutoResolve] Check failed:", e);
      }
    };

    // Poll every 5 seconds to check on-chain time
    const interval = setInterval(checkAndAutoResolve, 5000);
    checkAndAutoResolve(); // Run immediately on mount
    return () => clearInterval(interval);
  }, [activeBattleId, incomingAttacker]);

  // 5. Defender Sync (clears incoming state if battle is resolved elsewhere)
  useEffect(() => {
    if (!activeBattleId && incomingAttacker !== null) {
      // Battle was cleared on attacker side, sync defender side
      const checkDefenderBattle = async () => {
        try {
          const battle = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.PVP_ARENA,
            abi: PVP_ARENA_ABI,
            functionName: 'getActiveBattleForDefender',
            args: [address as `0x${string}`]
          }) as any;

          if (battle.id === 0n ||
            battle.status === 2 ||
            battle.status === 3 ||
            battle.status === 4) {
            setIncomingAttacker(null);
            setEtaSeconds(0);
          }
        } catch (e) {

        }
      };
      checkDefenderBattle();
    }
  }, [activeBattleId, address]);

  const handleLaunchSiege = () => {
    if (!selectedTarget) return;


    const randomBytesRequest = new Uint8Array(32);
    crypto.getRandomValues(randomBytesRequest);
    const commitment = toHex(randomBytesRequest);

    launchSiege({
      address: CONTRACT_ADDRESSES.PVP_ARENA,
      abi: PVP_ARENA_ABI,
      functionName: 'issueChallenge',
      args: [selectedTarget as `0x${string}`, commitment],
      gas: 5_000_000n,
      gasPrice: 1_000_000_000n,
      type: 'legacy' as const,
    });
  };

  const handleIntercept = () => {

    if (!activeBattleId) return;
    interceptRaid({
      address: CONTRACT_ADDRESSES.PVP_ARENA,
      abi: PVP_ARENA_ABI,
      functionName: 'interceptRaid',
      args: [activeBattleId],
      gas: 2_000_000n,
      gasPrice: 1_000_000_000n,
      type: 'legacy' as const,
    });
  };

  const handleResolve = () => {
    if (!activeBattleId) return;
    resolveRaid({
      address: CONTRACT_ADDRESSES.PVP_ARENA,
      abi: PVP_ARENA_ABI,
      functionName: 'resolveBattle',
      args: [activeBattleId],
      gas: 3_000_000n,
      gasPrice: 1_000_000_000n,
      type: 'legacy' as const,
    });
  };

  const isAttacking = siegePending || siegeConfirming;

  const { data: topPlayersData, isLoading: topPlayersLoading, refetch: refetchTopPlayers } = useReadContract({
    address: CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT,
    abi: LEADERBOARD_CONTRACT_ABI,
    functionName: 'getTopPlayers',
    args: [10],
  });

  // MULTICALL: Fetch lastActivityAt for all players in the list
  const { data: statsData } = useReadContracts({
    contracts: (topPlayersData ? (topPlayersData as any)[0] : []).map((addr: string) => ({
      address: CONTRACT_ADDRESSES.LEADERBOARD_CONTRACT,
      abi: LEADERBOARD_CONTRACT_ABI,
      functionName: 'getPlayerStats',
      args: [addr],
    })),
  });

  // Sync Multicall data to local onlineStatus state
  useEffect(() => {
    if (!statsData || !topPlayersData) return;
    const addresses = (topPlayersData as any)[0] as string[];
    const newStatus: Record<string, number> = { ...onlineStatus };

    statsData.forEach((result: any, i: number) => {
      if (result.status === 'success' && result.result) {
        const lastAct = Number(result.result.lastActivityAt);
        const addr = addresses[i].toLowerCase();
        // Only set if we don't have a more recent reactivity ping
        if (!newStatus[addr] || lastAct > newStatus[addr]) {
          newStatus[addr] = lastAct;
        }
      }
    });

    setOnlineStatus(newStatus);
  }, [statsData, topPlayersData]);

  const { onlineTargets, idleTargets } = useMemo(() => {
    const fetchedPlayers = topPlayersData ? (topPlayersData as [string[], number[], string[]])[0].map((addr, i) => {
      const lastActivity = onlineStatus[addr.toLowerCase()] || 0;
      // Increased window to 10 minutes (600s)
      const isOnline = (Math.floor(Date.now() / 1000) - lastActivity) < 600;

      return {
        address: addr,
        name: (topPlayersData as [string[], number[], string[]])[2][i] || 'Unknown Empire',
        wins: (topPlayersData as [string[], number[], string[]])[1][i],
        loot: (10 + (i * 2)).toString(),
        def: 50 + (i * 10),
        winChance: 70 - (i * 5),
        isOnline
      };
    }) : [];

    const allTargets = [...fetchedPlayers, ...manualTargets];

    const uniqueTargets = allTargets.filter(
      (target, index, self) =>
        target.address.toLowerCase() !== address?.toLowerCase() &&
        index === self.findIndex((t) => t.address.toLowerCase() === target.address.toLowerCase())
    );

    return {
      onlineTargets: uniqueTargets.filter(t => t.isOnline),
      idleTargets: uniqueTargets.filter(t => !t.isOnline)
    };
  }, [topPlayersData, address, onlineStatus, manualTargets]);

  const selectTarget = (target: any) => {
    setSelectedTarget(target.address);
    setSelectedTargetData(target);
  };

  const topDefenseBuildings = useMemo(() => {
    if (!myBuildingsData) return [];
    const buildingNames: Record<number, string> = {
      0: 'Empty', 1: 'Mine', 2: 'Lumber Mill', 3: 'Quarry',
      4: 'Barracks', 5: 'Wall', 6: 'Tower', 7: 'Vault'
    };
    const defenseTypes = [5, 6]; // WALL and TOWER contribute to defense
    return (myBuildingsData as any[])
      .filter(b => defenseTypes.includes(Number(b.buildingType)) && Number(b.buildingType) !== 0)
      .sort((a, b) => Number(b.level) - Number(a.level))
      .slice(0, 3)
      .map(b => ({
        name: buildingNames[Number(b.buildingType)] || 'Unknown',
        level: Number(b.level)
      }));
  }, [myBuildingsData]);

  const isAttackOnCooldown = cooldownData ? (cooldownData as any)[0] : false;
  const isDefendOnCooldown = cooldownData ? (cooldownData as any)[1] : false;

  return (
    <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden h-full">

      <style>{`
        @keyframes raidBorderPulse {
          0%, 100% { border-color: rgba(247, 37, 133, 0.5); box-shadow: 0 0 10px rgba(247, 37, 133, 0.2); }
          50% { border-color: rgba(247, 37, 133, 1); box-shadow: 0 0 25px rgba(247, 37, 133, 0.5); }
        }
        .eta-flash {
          animation: etaFlash 2s ease-in-out infinite;
        }
        @keyframes etaFlash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes radarSweep {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes heartbeatPulse {
          0%, 100% { transform: scaleX(1); opacity: 0.8; }
          10% { transform: scaleX(1.1); opacity: 1; }
          20% { transform: scaleX(1); opacity: 0.8; }
        }
        .eta-glitch {
          animation: glitchText 2s infinite;
        }
        @keyframes glitchText {
          0%, 100% { opacity: 1; transform: translate(0); }
          5% { opacity: 0.8; transform: translate(2px, -2px); }
          10% { opacity: 1; transform: translate(-2px, 2px); }
          15% { opacity: 1; transform: translate(0); }
        }
        .targeted-reticle {
          background: 
            linear-gradient(90deg, #00F5D4, #00F5D4) top left/10px 2px no-repeat,
            linear-gradient(0deg, #00F5D4, #00F5D4) top left/2px 10px no-repeat,
            linear-gradient(90deg, #00F5D4, #00F5D4) top right/10px 2px no-repeat,
            linear-gradient(0deg, #00F5D4, #00F5D4) top right/2px 10px no-repeat,
            linear-gradient(90deg, #00F5D4, #00F5D4) bottom left/10px 2px no-repeat,
            linear-gradient(0deg, #00F5D4, #00F5D4) bottom left/2px 10px no-repeat,
            linear-gradient(90deg, #00F5D4, #00F5D4) bottom right/10px 2px no-repeat,
            linear-gradient(0deg, #00F5D4, #00F5D4) bottom right/2px 10px no-repeat;
        }
      `}</style>

      {/* CHANGE 4: TWO MAIN PANELS SPLIT EVENLY */}
      {/* LEFT: LAUNCH RAID */}
      <section className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-[#2A2A45] flex flex-col bg-[#0A0A14] min-h-[500px] lg:min-h-0">
        <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
          <h1 className="font-fantasy text-2xl text-[#F72585] tracking-tight flex items-center gap-3 uppercase">
            <span className="material-symbols-outlined text-2xl">swords</span>
            Launch Raid
          </h1>

          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5880] group-focus-within:text-primary transition-colors">search</span>
            <input
              className="w-full bg-[#0F0F1E] border border-[#2A2A45] rounded-lg pl-10 pr-4 py-3 text-sm text-[#F0EEFF] placeholder:text-[#5A5880] focus:ring-2 focus:ring-primary/50 focus:border-primary/60 outline-none transition-all"
              placeholder="Search wallet address..."
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              const trimmed = manualAddress.trim();
              if (!trimmed) return;
              const already = manualTargets.find(t =>
                t.address.toLowerCase() === trimmed.toLowerCase()
              );
              if (already) {
                setManualAddress('');
                return;
              }
              setManualTargets(prev => [...prev, {
                address: trimmed,
                name: trimmed.slice(0, 6) + '...' + trimmed.slice(-4),
                wins: 0,
                loot: '10',
                def: 50,
                winChance: 50,
                isOnline: true
              }]);
              setManualAddress('');
            }}
            className="mt-2 w-full py-2 rounded-lg bg-[#9B5DE5]/20 border border-[#9B5DE5]/40 text-[#D4D0F0] font-mono text-xs uppercase tracking-widest hover:bg-[#9B5DE5]/30 transition-all"
          >
            + Add Target
          </button>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5A5880] flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-teal animate-pulse"></span>
                Online Targets
              </h3>
              <button
                onClick={() => refetchTopPlayers()}
                className="p-1 hover:bg-[#2A2A45] rounded-md transition-colors"
                title="Refresh targets"
              >
                <RefreshCw className={`w-3 h-3 text-[#5A5880] ${topPlayersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {/* --- ONLINE SECTION --- */}
              <div className="space-y-2">
                {onlineTargets.length > 0 ? (
                  onlineTargets.map((t: any) => (
                    <div
                      key={t.address}
                      onClick={() => selectTarget(t)}
                      className={`group relative flex flex-col p-4 rounded-xl bg-[#0F0F1E] border cursor-pointer overflow-hidden transition-all duration-300 ${selectedTarget === t.address
                          ? 'border-[#00F5D4] bg-[#00F5D4]/10 targeted-reticle shadow-[inset_0_0_20px_rgba(0,245,212,0.15)]'
                          : 'border-[#2A2A45] hover:border-[#9B5DE5]/80 hover:bg-[#9B5DE5]/5'
                        }`}
                    >
                      <div className="flex items-center justify-between z-10">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {selectedTarget === t.address ? (
                              <Target className="w-4 h-4 text-[#00F5D4] animate-pulse drop-shadow-[0_0_8px_rgba(0,245,212,0.8)]" />
                            ) : (
                              <Crosshair className="w-4 h-4 text-[#5A5880] group-hover:text-[#9B5DE5] transition-colors" />
                            )}
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1 -right-1 w-2 h-2 bg-accent-teal rounded-full border border-[#0F0F1E] z-20"
                              style={{ boxShadow: '0 0 8px rgba(0, 245, 212, 0.8)' }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm ${selectedTarget === t.address ? 'text-[#00F5D4]' : 'text-[#D4D0F0]'}`}>
                              {(t as any).name || t.address.slice(0, 8) + '...'}
                            </span>
                            <span className="text-[8px] font-mono text-accent-teal animate-pulse uppercase tracking-tighter bg-accent-teal/10 px-1 rounded border border-accent-teal/30">Live</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className={`font-mono text-xs font-bold drop-shadow-[0_0_5px_rgba(255,214,10,0.4)] ${selectedTarget === t.address ? 'text-[#00F5D4]' : 'text-[#FFD60A]'}`}>
                            ~{t.loot}K
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono text-[#6B68A0]">DEF</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`h-1.5 w-1.5 rounded-sm ${i <= Math.ceil(t.def / 50) ? 'bg-[#F72585]' : 'bg-[#2A2A45]'}`}></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      {selectedTarget !== t.address && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#9B5DE5]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-primary/30 font-mono text-[10px] border border-primary/10 rounded-lg dashed">
                    📡 NO HIGH-ACTIVITY SIGNALS IN SECTOR.
                  </div>
                )}
              </div>

              {/* --- IDLE SECTION --- */}
              {idleTargets.length > 0 && (
                <div className="pt-4 border-t border-[#2A2A45]/30">
                  <h3 className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#4A4870] mb-3 px-1">
                    Detected Signals (Idle)
                  </h3>
                  <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity duration-500">
                    {idleTargets.map((t: any) => (
                      <div
                        key={t.address}
                        onClick={() => selectTarget(t)}
                        className={`group relative flex flex-col p-3 rounded-lg bg-[#0A0A14] border cursor-pointer overflow-hidden transition-all duration-300 ${selectedTarget === t.address
                            ? 'border-[#9B5DE5]/60 bg-[#9B5DE5]/5'
                            : 'border-[#1A1A2A] hover:border-[#2A2A45] hover:bg-[#0F0F1E]'
                          }`}
                      >
                        <div className="flex items-center justify-between z-10">
                          <div className="flex items-center gap-3">
                            <Activity className="w-3 h-3 text-[#3A3860]" />
                            <span className={`font-mono text-xs ${selectedTarget === t.address ? 'text-[#9B5DE5]' : 'text-[#6B68A0]'}`}>
                              {(t as any).name || t.address.slice(0, 8) + '...'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-[#4A4870]">OFFLINE</span>
                            <span className="font-mono text-[10px] text-[#5A5880]">~{t.loot}K</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5A5880]">Troop Deployment</h3>
              <span className="font-mono text-xl text-[#FFD60A] font-bold drop-shadow-[0_0_8px_rgba(255,214,10,0.6)]">{troopDeployment}%</span>
            </div>

            <div className="relative h-12 bg-[#080810] rounded-xl border border-[#2A2A45] p-2 flex items-center">
              {/* Highlight Track */}
              <motion.div
                className="absolute left-2 top-2 bottom-2 rounded-lg bg-gradient-to-r from-[#FFD60A]/20 to-[#FFD60A]"
                initial={false}
                animate={{ width: `calc(${troopDeployment}% - 16px)` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{ boxShadow: troopDeployment > 0 ? '0 0 15px rgba(255, 214, 10, 0.4)' : 'none' }}
              />

              <input
                type="range"
                min="0" max="100" step="25"
                value={troopDeployment}
                onChange={(e) => setTroopDeployment(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              <div className="w-full flex justify-between px-1 z-0 pointer-events-none">
                {[0, 25, 50, 75, 100].map(val => (
                  <div key={val} className="flex flex-col items-center gap-1">
                    <div className={`w-0.5 h-3 rounded-full ${troopDeployment >= val ? 'bg-white' : 'bg-[#2A2A45]'}`} />
                    <span className={`text-[8px] font-mono font-bold ${val === 100 ? 'text-[#F72585]' : troopDeployment >= val ? 'text-white' : 'text-[#5A5880]'}`}>
                      {val === 100 ? 'MAX' : val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CHANGE 2 & 5: Estimated Outcomes Card with Placeholder */}
          <div className="p-4 rounded-xl bg-[#0F0F1E] border border-[#9B5DE5]/30 space-y-3">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A09DC0]">Estimated Outcomes</h4>

            {!selectedTarget ? (
              <div id="no-target-msg" className="text-center py-4">
                <span className="material-symbols-outlined text-[#2A2A45] text-4xl">gps_not_fixed</span>
                <p className="text-[11px] font-mono text-[#5A5880] mt-2 uppercase tracking-widest">Select a target above</p>
              </div>
            ) : (
              <div id="outcomes-data" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-[#6B68A0] uppercase font-mono tracking-widest">Win Probability</p>
                  <p className={`font-mono text-3xl font-bold ${(selectedTargetData.winChance * (troopDeployment / 75)) >= 65 ? 'text-[#00F5D4]' :
                      (selectedTargetData.winChance * (troopDeployment / 75)) >= 45 ? 'text-[#FFD60A]' : 'text-[#F72585]'
                    }`}>
                    {(selectedTargetData.winChance * (troopDeployment / 75)).toFixed(1)}%
                  </p>
                  <p className="text-[9px] font-mono text-[#5A5880]">Based on DEF rating</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#6B68A0] uppercase font-mono tracking-widest">Est. Loot</p>
                  <p className="font-mono text-3xl font-bold text-[#FFD60A]">
                    ~{(selectedTargetData.loot * (troopDeployment / 75)).toFixed(1)}K
                  </p>
                  <p className="text-[9px] font-mono text-[#5A5880]">Credits on victory</p>
                </div>
              </div>
            )}

            {/* Pyth Entropy badge */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#2A2A45]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFD60A] animate-pulse"></span>
              <span className="text-[9px] font-mono text-[#6B68A0] uppercase tracking-widest">
                Secured by <span className="text-[#FFD60A]">Pyth Entropy</span> — provably fair
              </span>
            </div>
          </div>
        </div>

        {/* CHANGE 1: SIEGE BUTTON OVERHAUL */}
        <div className="p-4 md:p-6 border-t border-[#2A2A45]">
          {activeBattleId !== null && incomingAttacker === null ? (
            etaSeconds > 0 ? (
              <div className="flex flex-col gap-3">
                <button disabled className="w-full h-14 md:h-16 rounded-xl bg-[#2A2A45] text-white font-fantasy text-base md:text-xl tracking-widest flex items-center justify-center gap-3 text-center px-2">
                  <span className="material-symbols-outlined text-xl animate-spin">sync</span>
                  RESOLVING IN {formatEta(etaSeconds)}
                </button>
                <button
                  onClick={handleResolve}
                  disabled={resolvePending}
                  className="w-full py-2 rounded-lg bg-[#9B5DE5]/20 border border-[#9B5DE5]/40 text-[#D4D0F0] font-mono text-xs uppercase tracking-widest hover:bg-[#9B5DE5]/30 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  {resolvePending ? 'RESOLVING...' : 'Resolve Now'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleResolve}
                disabled={resolvePending}
                className="w-full h-14 md:h-16 rounded-xl bg-gradient-to-r from-[#00F5D4] to-[#FFD60A] text-[#0A0A14] font-fantasy text-xl md:text-2xl tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(0,245,212,0.4)]"
              >
                <span className="material-symbols-outlined text-2xl">bolt</span>
                {resolvePending ? 'RESOLVING...' : 'CLAIM LOOT'}
              </button>
            )
          ) : (
            <button
              onClick={handleLaunchSiege}
              disabled={!selectedTarget || isAttacking}
              className="w-full h-14 md:h-16 rounded-xl bg-gradient-to-r from-[#9B5DE5] to-[#F72585] text-white font-fantasy text-xl md:text-2xl tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              style={{ boxShadow: '0 0 30px rgba(155,93,229,0.5), 0 0 60px rgba(247,37,133,0.2)' }}
            >
              {isAttacking ? (
                <span className="material-symbols-outlined text-2xl animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-2xl">swords</span>
              )}
              {isAttacking ? 'LAUNCHING...' : 'SIEGE!'}
            </button>
          )}
        </div>
      </section>

      {/* RIGHT: YOUR DEFENSE */}
      <section className="w-full lg:w-1/2 flex flex-col bg-[#0D0A18] overflow-y-auto lg:overflow-hidden lg:custom-scrollbar min-h-[500px] lg:min-h-0">
        <div className="p-4 md:p-8 space-y-5 md:space-y-8">
          <h1 className="font-fantasy text-2xl text-accent-teal tracking-tight flex items-center gap-3 uppercase">
            <span className="material-symbols-outlined text-2xl">shield</span>
            Your Defense
          </h1>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5A5880]">Hull Integrity</span>
              <span className="font-mono text-sm font-bold text-accent-teal">
                {myBaseData ? `${(myBaseData as any).defensePower} / ${Math.floor((myBaseData as any).defensePower * 1.5)} HP` : '-- / -- HP'}
              </span>
            </div>
            <div className="w-full h-4 bg-[#0F0F1E] rounded-full overflow-hidden border border-[#2A2A45] p-0.5 relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '68%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-accent-teal rounded-full shadow-[0_0_12px_rgba(0,245,212,0.5)] relative overflow-hidden"
              >
                {/* Heartbeat / Scanning Laser Effect */}
                <div
                  className="absolute inset-0 w-[20%] bg-gradient-to-r from-transparent via-white/80 to-transparent"
                  style={{ animation: 'heartbeatPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', transformOrigin: 'left' }}
                />
              </motion.div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 p-3 md:p-5 rounded-2xl bg-[#0F0F1E] border border-[#2A2A45] text-center hover:border-primary/40 transition-colors group">
              <p className="text-[10px] font-mono font-bold uppercase text-[#5A5880] mb-2 md:mb-3 tracking-widest">Defense Rating</p>
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-[#9B5DE5] group-hover:drop-shadow-[0_0_10px_rgba(155,93,229,0.8)] transition-all" />
                <p className="font-mono text-2xl font-bold text-[#F0EEFF]">{myBaseData ? (myBaseData as any).defensePower?.toString() : '--'}</p>
              </div>
            </div>
            <div className="flex-1 p-3 md:p-5 rounded-2xl bg-[#0F0F1E] border border-[#2A2A45] text-center hover:border-primary/40 transition-colors group">
              <p className="text-[10px] font-mono font-bold uppercase text-[#5A5880] mb-2 md:mb-3 tracking-widest">Active Shields</p>
              <div className="flex items-center justify-center gap-2">
                <Activity className="w-5 h-5 text-[#00F5D4] group-hover:drop-shadow-[0_0_10px_rgba(0,245,212,0.8)] transition-all" />
                <p className="font-mono text-xl font-bold text-[#F0EEFF]">{myBaseData ? `${(myBaseData as any).buildingCount} LAYERS` : '-- LAYERS'}</p>
              </div>
            </div>
          </div>

          {/* Top Defense Buildings */}
          <div className="mt-4 border border-[#9B5DE5]/20 rounded-lg p-3">
            <p className="text-[10px] font-mono font-bold uppercase text-[#5A5880] mb-2 tracking-widest">Top Defense Structures</p>
            {topDefenseBuildings.length > 0 ? (
              topDefenseBuildings.map((b, i) => (
                <div key={i} className="flex justify-between items-center py-1 border-b border-[#9B5DE5]/10 last:border-0">
                  <span className="font-mono text-xs text-[#D4D0F0]">{b.name}</span>
                  <span className="font-mono text-xs font-bold text-[#9B5DE5]">LVL {b.level}</span>
                </div>
              ))
            ) : (
              <p className="font-mono text-xs text-[#5A5880]">No defense structures built</p>
            )}
          </div>

          {/* Cooldown Status */}
          <div className="mt-3 border border-[#9B5DE5]/20 rounded-lg p-3">
            <p className="text-[10px] font-mono font-bold uppercase text-[#5A5880] mb-2 tracking-widest">Cooldown Status</p>
            <div className="flex justify-between items-center py-1">
              <span className="font-mono text-xs text-[#D4D0F0]">Attack</span>
              <span className={`font-mono text-xs font-bold ${isAttackOnCooldown ? 'text-[#F72585]' : 'text-[#00F5D4]'}`}>
                {isAttackOnCooldown ? 'ON COOLDOWN' : 'READY'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-mono text-xs text-[#D4D0F0]">Defense</span>
              <span className={`font-mono text-xs font-bold ${isDefendOnCooldown ? 'text-[#F72585]' : 'text-[#00F5D4]'}`}>
                {isDefendOnCooldown ? 'ON COOLDOWN' : 'READY'}
              </span>
            </div>
          </div>

          {/* CHANGE 6: Dramatically Pulsing Border */}
          {/* CHANGE 6: Dramatically Pulsing Border */}
          {/* CHANGE 5: Incoming Raid Alert */}
          {activeBattleId !== null && incomingAttacker !== null ? (
            <div className="relative rounded-xl p-[2px] overflow-hidden group">
              {/* Animated Gradient Border */}
              <div
                className="absolute inset-0 bg-[length:200%_auto] opacity-80"
                style={{
                  background: 'linear-gradient(90deg, #F72585, transparent, #F72585, transparent)',
                  animation: 'radarSweep 3s linear infinite'
                }}
              />
              {/* Inner Content */}
              <div className="relative bg-[#0D0A18] rounded-lg p-5 space-y-4 shadow-[inset_0_0_30px_rgba(247,37,133,0.15)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6 text-[#F72585] animate-pulse drop-shadow-[0_0_10px_rgba(247,37,133,0.8)]" />
                    <h2 className="font-fantasy text-lg text-[#F72585] tracking-wider uppercase drop-shadow-[0_0_5px_rgba(247,37,133,0.5)]">Incoming Raid</h2>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#F72585]/10 border border-[#F72585]/30 px-2 py-1 rounded">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F72585] animate-pulse"></span>
                    <span className="text-[9px] font-mono text-[#F72585] uppercase tracking-widest">Reactivity</span>
                  </div>
                </div>

                <div className="space-y-3 text-sm font-mono">
                  <div className="flex justify-between items-center py-2 border-b border-[#F72585]/20 text-xs">
                    <span className="text-[#6B68A0] uppercase tracking-widest">Attacker</span>
                    <span className="text-[#D4D0F0] font-bold">{incomingAttacker ? `${incomingAttacker.slice(0, 6)}...${incomingAttacker.slice(-4)}` : 'UNKNOWN'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#F72585]/20 text-xs">
                    <span className="text-[#6B68A0] uppercase tracking-widest">Troop Size</span>
                    <span className="text-[#F72585] font-bold drop-shadow-[0_0_5px_rgba(247,37,133,0.3)]">{attackerVanguard !== null ? attackerVanguard.toLocaleString() + ' Vanguard' : 'Loading...'}</span>
                  </div>
                  {/* SOMNIA REACTIVITY LABEL & ETA */}
                  <div className="flex justify-between items-center py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-mono uppercase text-[#6B68A0] tracking-widest">ETA</span>
                      <span className="text-[8px] font-mono text-[#F72585]/60 uppercase tracking-widest">System Warning</span>
                    </div>
                    <span className={`font-mono text-xl font-bold text-[#F72585] drop-shadow-[0_0_8px_rgba(247,37,133,0.8)] ${etaSeconds > 0 && etaSeconds <= 10 ? 'eta-glitch text-[#FFD60A]' : ''}`}>
                      {formatEta(etaSeconds)}
                    </span>
                  </div>
                </div>

                {etaSeconds <= 0 ? (
                  <button
                    disabled={!activeBattleId || resolvePending}
                    onClick={handleResolve}
                    className="w-full relative overflow-hidden group py-3 rounded-lg border border-[#00F5D4] bg-[#00F5D4]/20 text-[#00F5D4] font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] hover:bg-[#00F5D4] hover:text-[#0A0A14] shadow-[0_0_15px_rgba(0,245,212,0.4)]"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base">bolt</span>
                      {resolvePending ? 'RESOLVING...' : 'RESOLVE ENCOUNTER'}
                    </span>
                  </button>
                ) : (
                  <button
                    disabled={!activeBattleId || interceptPending}
                    onClick={handleIntercept}
                    className="w-full relative overflow-hidden group py-3 rounded-lg border border-[#F72585] bg-[#F72585]/10 text-[#F72585] font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale hover:bg-[#F72585] hover:text-white"
                    style={{ boxShadow: '0 0 15px rgba(247,37,133,0.2)' }}
                  >
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[radarSweep_1.5s_infinite]" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      {interceptPending ? 'INTERCEPTING...' : 'Intercept Protocol'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-2 text-[10px] text-[#2A2A45] font-mono text-center border border-dashed border-[#2A2A45] rounded-xl">
              No tactical threats detected in sector.
            </div>
          )}
        </div>
      </section>

      {/* Battle Result Modal */}
      <AnimatePresence>
        {battleResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0F0F1E] border border-[#2A2A45] rounded-2xl p-5 sm:p-8 w-full max-w-sm text-center space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <div className="flex justify-center">
                {battleResult.won ? (
                  <Trophy className="w-16 h-16 text-[#00F5D4] drop-shadow-[0_0_20px_rgba(0,245,212,0.8)]" />
                ) : (
                  <Skull className="w-16 h-16 text-[#F72585] drop-shadow-[0_0_20px_rgba(247,37,133,0.8)]" />
                )}
              </div>
              <h2 className={`font-fantasy text-2xl sm:text-3xl tracking-widest uppercase ${battleResult.target === 'expired' ? 'text-gray-400' : battleResult.won ? 'text-[#00F5D4] drop-shadow-[0_0_10px_rgba(0,245,212,0.5)]' : 'text-[#F72585] drop-shadow-[0_0_10px_rgba(247,37,133,0.5)]'}`}>
                {battleResult.target === 'expired' ? 'EXPIRED' : battleResult.won ? 'VICTORY' : 'DEFEATED'}
              </h2>
              <p className="text-[#A09DC0] text-sm font-mono leading-relaxed text-center break-words">
                {(() => {
                  const displayTarget = battleResult.target?.startsWith('0x') && battleResult.target.length === 42
                    ? battleResult.target.slice(0, 6) + '...' + battleResult.target.slice(-4)
                    : battleResult.target;
                  return battleResult.target === 'expired'
                    ? 'The battle window expired. No resources were transferred.'
                    : battleResult.won
                      ? battleResult.loot > 0
                        ? `Raid successful. Looted ${battleResult.loot.toLocaleString()} Credits from ${displayTarget}`
                        : battleResult.target === (incomingAttacker || '')
                          ? `Your defense held! The raid from ${displayTarget} was repelled!`
                          : `Victory! Your forces overwhelmed ${displayTarget}.`
                      : 'Your forces were repelled. Regroup and try again.';
                })()}
              </p>
              <div className="flex items-center justify-center gap-1.5 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FFD60A] animate-pulse"></span>
                <span className="text-[9px] font-mono text-[#6B68A0] uppercase tracking-widest">
                  Result verified by Pyth Entropy
                </span>
              </div>
              <button
                onClick={() => {
                  setBattleResult(null);
                  setActiveBattleId(null);
                  setIncomingAttacker(null);
                  setEtaSeconds(0);
                  autoResolveTriggered.current = false;
                }}
                className="w-full py-3 rounded-lg bg-[#9B5DE5]/20 border border-[#9B5DE5]/40 text-[#D4D0F0] font-bold text-sm uppercase tracking-widest hover:bg-[#9B5DE5]/30 transition-all active:scale-[0.98]"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
