// src/constants/contracts.ts
// ─────────────────────────────────────────────────────────────────────────────
// DreamSiege — Contract Addresses, ABIs, and Network Config
// Fill in addresses after deployment. Chain: Somnia Shannon Testnet (50312)
// ─────────────────────────────────────────────────────────────────────────────

import { defineChain } from "viem";

// ── Custom Chain Definition ───────────────────────────────────────────────────
export const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["wss://dream-rpc.somnia.network/ws"]
    },
    public: {
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["wss://dream-rpc.somnia.network/ws"]
    },
  },
  blockExplorers: {
    default: {
      name: "Shannon Explorer",
      url: "https://shannon-explorer.somnia.network",
    },
  },
  testnet: true,
});

// ── Contract Addresses (fill after deploy) ────────────────────────────────────
export const CONTRACT_ADDRESSES = {
  BASE_CONTRACT: '0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66',
  RESOURCE_VAULT: '0x15c18a11ca29e56a068fb21f4662129dbdbe20ba',
  PVP_ARENA: '0xd8665b7f204b073843334d9747317829e5a83945' as `0x${string}`,
  LEADERBOARD_CONTRACT: '0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b',
  EMPIRE_REGISTRY: '0x1d617cC33411562c0c25Ce35A1B6F08E92d74916',
  REWARDS_DISTRIBUTOR: '0x9e05bB09A8ffE776585E61d5378cCd89DdA239d5',
} as const;

// ── BaseContract ABI ──────────────────────────────────────────────────────────
export const BASE_CONTRACT_ABI = [
  // Write
  { name: "initializeBase", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    name: "placeBuilding", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "slot", type: "uint8" }, { name: "buildingType", type: "uint8" }], outputs: []
  },
  {
    name: "startUpgrade", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "slot", type: "uint8" }], outputs: []
  },
  { name: "collectResources", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    name: "claimUpgrade", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }], outputs: []
  },
  { name: "syncStats", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },

  // Read
  {
    name: "getBase", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{
      type: "tuple", components: [
        { name: "owner", type: "address" },
        { name: "initialized", type: "bool" },
        { name: "gold", type: "uint64" },
        { name: "wood", type: "uint64" },
        { name: "stone", type: "uint64" },
        { name: "attackPower", type: "uint32" },
        { name: "defensePower", type: "uint32" },
        { name: "lastTickAt", type: "uint40" },
        { name: "totalWins", type: "uint32" },
        { name: "totalLosses", type: "uint32" },
        { name: "goldRate", type: "uint64" },
        { name: "woodRate", type: "uint64" },
        { name: "stoneRate", type: "uint64" },
        { name: "buildingCount", type: "uint8" },
      ]
    }]
  },

  {
    name: "getBuilding", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }, { name: "slot", type: "uint8" }],
    outputs: [{
      type: "tuple", components: [
        { name: "buildingType", type: "uint8" },
        { name: "level", type: "uint8" },
        { name: "upgradeEndsAt", type: "uint40" },
      ]
    }]
  },

  {
    name: "getAllBuildings", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{
      type: "tuple[100]", components: [
        { name: "buildingType", type: "uint8" },
        { name: "level", type: "uint8" },
        { name: "upgradeEndsAt", type: "uint40" },
      ]
    }]
  },

  {
    name: "hasBase", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }], outputs: [{ type: "bool" }]
  },



  // Events (for Reactivity SDK subscription)
  {
    name: "BaseInitialized", type: "event",
    inputs: [{ name: "owner", type: "address", indexed: true }, { name: "baseId", type: "uint256", indexed: true }]
  },
  {
    name: "ResourceTick", type: "event",
    inputs: [
      { name: "baseId", type: "uint256", indexed: true },
      { name: "gold", type: "uint64" },
      { name: "wood", type: "uint64" },
      { name: "stone", type: "uint64" },
      { name: "timestamp", type: "uint40" },
    ]
  },
  {
    name: "BuildingPlaced", type: "event",
    inputs: [{ name: "baseId", type: "uint256", indexed: true }, { name: "slot", type: "uint8" }, { name: "buildingType", type: "uint8" }]
  },
  {
    name: "UpgradeStarted", type: "event",
    inputs: [{ name: "baseId", type: "uint256", indexed: true }, { name: "slot", type: "uint8" }, { name: "newLevel", type: "uint8" }, { name: "endsAt", type: "uint40" }, { name: "jobId", type: "uint256" }]
  },
  {
    name: "UpgradeComplete", type: "event",
    inputs: [{ name: "baseId", type: "uint256", indexed: true }, { name: "slot", type: "uint8" }, { name: "newLevel", type: "uint8" }, { name: "jobId", type: "uint256" }]
  },
  {
    name: "ResourcesCollected", type: "event",
    inputs: [
      { name: "collector", type: "address", indexed: true },
      { name: "baseId", type: "uint256", indexed: true },
      { name: "gold", type: "uint64" },
      { name: "wood", type: "uint64" },
      { name: "stone", type: "uint64" },
    ]
  },
  {
    name: "BaseStatsUpdated", type: "event",
    inputs: [{ name: "baseId", type: "uint256", indexed: true }, { name: "attackPower", type: "uint32" }, { name: "defensePower", type: "uint32" }]
  },
] as const;

// ── PvPArena ABI ─────────────────────────────────────────────────────────────
export const PVP_ARENA_ABI = [
  // Write
  {
    name: "issueChallenge", type: "function", stateMutability: "payable",
    inputs: [{ name: "defender", type: "address" }, { name: "userRandomness", type: "bytes32" }], outputs: [{ name: "battleId", type: "uint256" }]
  },
  {
    name: "resolveBattle", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "battleId", type: "uint256" }], outputs: []
  },
  {
    name: "interceptRaid", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "battleId", type: "uint256" }], outputs: []
  },

  // Read
  {
    name: "getBattle", type: "function", stateMutability: "view",
    inputs: [{ name: "battleId", type: "uint256" }],
    outputs: [{
      type: "tuple", components: [
        { name: "id", type: "uint256" },
        { name: "attacker", type: "address" },
        { name: "defender", type: "address" },
        { name: "status", type: "uint8" },
        { name: "attackerWon", type: "bool" },
        { name: "attackerPower", type: "uint32" },
        { name: "defenderPower", type: "uint32" },
        { name: "lootCredits", type: "uint64" },
        { name: "lootBiomass", type: "uint64" },
        { name: "lootMinera", type: "uint64" },
        { name: "createdAt", type: "uint40" },
        { name: "resolvedAt", type: "uint40" },
        { name: "entropySequence", type: "uint64" },
        { name: "entropyCommit", type: "bytes32" },
        { name: "attackerEmpire", type: "string" },
        { name: "defenderEmpire", type: "string" },
      ]
    }]
  },

  {
    name: "getActiveBattleForAttacker", type: "function", stateMutability: "view",
    inputs: [{ name: "attacker", type: "address" }],
    outputs: [{
      type: "tuple", components: [
        { name: "id", type: "uint256" },
        { name: "attacker", type: "address" },
        { name: "defender", type: "address" },
        { name: "status", type: "uint8" },
        { name: "attackerWon", type: "bool" },
        { name: "attackerPower", type: "uint32" },
        { name: "defenderPower", type: "uint32" },
        { name: "lootCredits", type: "uint64" },
        { name: "lootBiomass", type: "uint64" },
        { name: "lootMinera", type: "uint64" },
        { name: "createdAt", type: "uint40" },
        { name: "resolvedAt", type: "uint40" },
        { name: "entropySequence", type: "uint64" },
        { name: "entropyCommit", type: "bytes32" },
        { name: "attackerEmpire", type: "string" },
        { name: "defenderEmpire", type: "string" },
      ]
    }]
  },
  {
    name: "getActiveBattleForDefender", type: "function", stateMutability: "view",
    inputs: [{ name: "defender", type: "address" }],
    outputs: [{
      type: "tuple", components: [
        { name: "id", type: "uint256" },
        { name: "attacker", type: "address" },
        { name: "defender", type: "address" },
        { name: "status", type: "uint8" },
        { name: "attackerWon", type: "bool" },
        { name: "attackerPower", type: "uint32" },
        { name: "defenderPower", type: "uint32" },
        { name: "lootCredits", type: "uint64" },
        { name: "lootBiomass", type: "uint64" },
        { name: "lootMinera", type: "uint64" },
        { name: "createdAt", type: "uint40" },
        { name: "resolvedAt", type: "uint40" },
        { name: "entropySequence", type: "uint64" },
        { name: "entropyCommit", type: "bytes32" },
        { name: "attackerEmpire", type: "string" },
        { name: "defenderEmpire", type: "string" },
      ]
    }]
  },

  {
    name: "getWinChance", type: "function", stateMutability: "view",
    inputs: [{ name: "attacker", type: "address" }, { name: "defender", type: "address" }],
    outputs: [{ name: "winChance", type: "uint256" }]
  },
  {
    name: "isOnCooldown", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      { name: "attacking", type: "bool" },
      { name: "defending", type: "bool" }
    ]
  },
  // Events
  {
    name: "ChallengeIssued", type: "event",
    inputs: [
      { name: "battleId", type: "uint256", indexed: true },
      { name: "attacker", type: "address", indexed: true },
      { name: "defender", type: "address", indexed: true },
      { name: "attackerEmpire", type: "string" },
      { name: "defenderEmpire", type: "string" },
      { name: "attackerPower", type: "uint32" },
      { name: "defenderPower", type: "uint32" },
      { name: "expiresAt", type: "uint40" },
    ]
  },
  {
    name: "BattleResolved", type: "event",
    inputs: [
      { name: "battleId", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "loser", type: "address", indexed: true },
      { name: "attackerWon", type: "bool" },
      { name: "creditsLooted", type: "uint64" },
      { name: "biomassLooted", type: "uint64" },
      { name: "mineraLooted", type: "uint64" },
      { name: "winnerEmpire", type: "string" },
      { name: "loserEmpire", type: "string" },
    ]
  },
  {
    name: "GlobalBattleEvent", type: "event",
    inputs: [
      { name: "battleId", type: "uint256", indexed: true },
      { name: "attackerEmpire", type: "string" },
      { name: "defenderEmpire", type: "string" },
      { name: "attackerWon", type: "bool" },
      { name: "totalLoot", type: "uint64" },
      { name: "timestamp", type: "uint40" },
    ]
  },
  {
    name: "RaidIntercepted", type: "event",
    inputs: [
      { name: "battleId", type: "uint256", indexed: true },
      { name: "defender", type: "address", indexed: true },
      { name: "attacker", type: "address", indexed: true },
      { name: "defenderEmpire", type: "string" },
      { name: "timestamp", type: "uint40" },
    ]
  },
  {
    name: "ChallengeExpired", type: "event",
    inputs: [
      { name: "battleId", type: "uint256", indexed: true },
      { name: "attacker", type: "address", indexed: true },
      { name: "defender", type: "address", indexed: true },
    ]
  },
] as const;

// ── EmpireRegistry ABI ────────────────────────────────────────────────────────
export const EMPIRE_REGISTRY_ABI = [
  // Write
  {
    name: "registerEmpire", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }, { name: "badge", type: "string" }], outputs: []
  },
  {
    name: "renameEmpire", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "newName", type: "string" }], outputs: []
  },
  {
    name: "updateBadge", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "newBadge", type: "string" }], outputs: []
  },

  // Read
  {
    name: "getEmpire", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{
      type: "tuple", components: [
        { name: "owner", type: "address" },
        { name: "name", type: "string" },
        { name: "badge", type: "string" },
        { name: "tier", type: "uint8" },
        { name: "registeredAt", type: "uint40" },
        { name: "lastUpdatedAt", type: "uint40" },
        { name: "exists", type: "bool" },
      ]
    }]
  },
  {
    name: "hasEmpire", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }], outputs: [{ type: "bool" }]
  },
  {
    name: "isNameAvailable", type: "function", stateMutability: "view",
    inputs: [{ name: "name", type: "string" }], outputs: [{ type: "bool" }]
  },

  {
    name: "EmpireRegistered", type: "event",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "name", type: "string" },
      { name: "badge", type: "string" },
      { name: "timestamp", type: "uint40" },
    ]
  },
  {
    name: "EmpireRenamed", type: "event",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "oldName", type: "string" },
      { name: "newName", type: "string" },
      { name: "timestamp", type: "uint40" },
    ]
  },
] as const;

// ── LeaderboardContract ABI ───────────────────────────────────────────────────
export const LEADERBOARD_CONTRACT_ABI = [
  // Read
  {
    name: "getPlayerStats", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{
      type: "tuple", components: [
        { name: "player", type: "address" },
        { name: "empireName", type: "string" },
        { name: "wins", type: "uint32" },
        { name: "losses", type: "uint32" },
        { name: "currentStreak", type: "uint32" },
        { name: "bestStreak", type: "uint32" },
        { name: "rank", type: "uint32" },
        { name: "totalLootEarned", type: "uint64" },
        { name: "totalLootLost", type: "uint64" },
        { name: "lastActivityAt", type: "uint40" },
        { name: "registered", type: "bool" },
      ]
    }]
  },
  {
    name: "getTopPlayers", type: "function", stateMutability: "view",
    inputs: [{ name: "n", type: "uint8" }],
    outputs: [
      { name: "players", type: "address[]" },
      { name: "wins", type: "uint32[]" },
      { name: "names", type: "string[]" }
    ]
  },

  {
    name: "getWinRate", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }], outputs: [{ name: "rate", type: "uint256" }]
  },

  // Events
  {
    name: "LeaderboardDataStream", type: "event",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "wins", type: "uint32" },
      { name: "losses", type: "uint32" },
      { name: "totalLootEarned", type: "uint64" },
      { name: "timestamp", type: "uint40" },
    ]
  },
  {
    name: "RankingUpdated", type: "event",
    inputs: [{ name: "player", type: "address", indexed: true }, { name: "newRank", type: "uint32" }, { name: "totalWins", type: "uint32" }]
  },
  {
    name: "WinStreakUpdated", type: "event",
    inputs: [{ name: "player", type: "address", indexed: true }, { name: "streak", type: "uint32" }, { name: "isNewBest", type: "bool" }]
  },
] as const;

// ── TypeScript Types ──────────────────────────────────────────────────────────
// ── ResourceVault ABI ────────────────────────────────────────────────────────
export const RESOURCE_VAULT_ABI = [
  // Write
  { name: "collectResources", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },

  // Read
  {
    name: "getResources", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{
      type: "tuple", components: [
        { name: "credits", type: "uint64" },
        { name: "biomass", type: "uint64" },
        { name: "minera", type: "uint64" },
        { name: "vanguard", type: "uint64" },
        { name: "lastTickAt", type: "uint40" },
        { name: "vaultCredits", type: "uint64" },
        { name: "vaultBiomass", type: "uint64" },
        { name: "vaultMinera", type: "uint64" },
      ]
    }]
  },
  {
    name: "previewCollection", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      { name: "credits", type: "uint64" },
      { name: "biomass", type: "uint64" },
      { name: "minera", type: "uint64" },
      { name: "vanguard", type: "uint64" },
    ]
  },

  {
    name: "vaults", type: "function", stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      { name: "credits", type: "uint64" },
      { name: "biomass", type: "uint64" },
      { name: "minera", type: "uint64" },
      { name: "vanguard", type: "uint64" },
      { name: "lastTickAt", type: "uint40" },
      { name: "vaultCredits", type: "uint64" },
      { name: "vaultBiomass", type: "uint64" },
      { name: "vaultMinera", type: "uint64" },
    ]
  },
  // Events
  {
    name: "ResourceUpdated", type: "event",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "credits", type: "uint64" },
      { name: "biomass", type: "uint64" },
      { name: "minera", type: "uint64" },
      { name: "vanguard", type: "uint64" },
      { name: "timestamp", type: "uint40" },
    ]
  },
] as const;

export type BuildingType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const BUILDING_NAMES: Record<BuildingType, string> = {
  0: "Empty",
  1: "Mine",
  2: "Lumber Mill",
  3: "Quarry",
  4: "Barracks",
  5: "Wall",
  6: "Tower",
  7: "Vault",
};

export type AttackStatus = 0 | 1 | 2; // PENDING | RESOLVED | CLAIMED

export interface BaseData {
  id: bigint;
  owner: `0x${string}`;
  initialized: boolean;
  gold: bigint;
  wood: bigint;
  stone: bigint;
  attackPower: number;
  defensePower: number;
  lastTickAt: number;
  totalWins: number;
  totalLosses: number;
}

export interface BuildingData {
  buildingType: BuildingType;
  level: number;
  upgradeEndsAt: number;
  // jobId is NOT in the on-chain Building struct; it comes from UpgradeJob mapping
}

export interface AttackData {
  id: bigint;
  attacker: `0x${string}`;
  defender: `0x${string}`;
  status: AttackStatus;
  attackerWon: boolean;
  launchedAt: number;
  resolvedAt: number;
  lootGold: bigint;
  lootWood: bigint;
  lootStone: bigint;
  atkPower: number;
  defPower: number;
}

export interface PlayerStats {
  player: `0x${string}`;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  rank: number;
  lastActivityAt: number;
}
