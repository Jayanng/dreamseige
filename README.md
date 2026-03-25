# 🏰 DreamSiege — Real-Time On-Chain PvP Strategy Game

**Built on Somnia Network · Powered by the Somnia Reactivity SDK**

**🎥 Demo Video:** [Watch on YouTube](https://youtu.be/t49XeeJbvR8) · **🌐 Live App:** https://dreamseige.vercel.app · **📦 GitHub:** https://github.com/Jayanng/dreamseige

> Siege your dream empire in real time. Build. Raid. Defend. All on-chain.

---

## What is DreamSiege?

DreamSiege is a fully on-chain multiplayer strategy game where two players go head-to-head in real time. You build a Citadel, grow your resources, and launch tactical sieges against other commanders. When someone attacks you, your screen lights up instantly — no refresh, no delay, no polling. The moment a raid lands on-chain, both players know about it at the same time.

This is possible because of the **Somnia Reactivity SDK**. Most blockchain apps work by asking the chain "did anything change?" every few seconds. DreamSiege flips that model entirely. The chain pushes events directly to every connected browser the moment they happen — the same way a messaging app pings you when a message arrives. This is what real-time on-chain gaming actually feels like.

---

## What Makes DreamSiege Special

Most blockchain games have a problem: they feel slow. You click something, you wait, you refresh. DreamSiege solves this by using Somnia's Reactivity SDK to deliver real-time push notifications straight to the browser. When someone raids you, your screen lights up instantly. When a battle resolves, both players see the result at the same moment. This is what gaming on a 1,000,000 TPS blockchain actually feels like.

---

## ⚡ How the Reactivity SDK Works in DreamSiege

Most blockchain apps work by asking the chain for updates over and over again — a technique called polling. Every few seconds, the app sends a request: "did anything change?" This works, but it is slow, wasteful, and never truly real-time. DreamSiege takes a completely different approach using the Somnia Reactivity SDK.

Instead of asking, DreamSiege listens. We open a persistent WebSocket connection to the Somnia network using the Reactivity SDK, and then we register listeners for specific on-chain events. When one of those events fires on the blockchain, Somnia pushes it directly to every connected browser within milliseconds — the same way a messaging app delivers a notification the moment a message is sent, without you having to keep refreshing your inbox.

DreamSiege uses this in three specific ways that together create the real-time experience.

The first is detecting incoming attacks. When an attacker submits their siege transaction and it confirms on-chain, the PvP Arena contract emits a `ChallengeIssued` event. The Reactivity SDK on the defender's browser picks this up immediately and fires a full-screen INCOMING RAID overlay — no matter what page the defender is currently on. This is handled by the `subscribeToIncomingAttack` function in `useReactivity.ts`, which filters the event stream to only react when the defender's own wallet address is the target.

The second is syncing battle results to both players at the same moment. When a battle is resolved on-chain — whether by the attacker claiming loot, the defender intercepting, or the auto-resolve timer firing — the contract emits a `BattleResolved` event. The `subscribeToAllResolutions` listener in `GameContext.tsx` receives this push on both players' browsers simultaneously. It determines whether the connected wallet is the winner or the loser, writes the correct entry to the Combat Archives, and triggers the appropriate victory or defeat modal. Because this happens via push on both sides at the same time, both modals appear within milliseconds of each other — which is the defining real-time moment of the entire game.

The third is the global activity feed and online presence system. Every significant battle event is broadcast through the Reactivity layer and reflected in the live ticker at the bottom of the landing page. In the Siege Chamber, the system listens to all activity events globally and stamps each player's last seen timestamp in real time to show who is currently active.

The **REACTIVITY LIVE** badge visible on every page of the app is not decorative — it is a live indicator that the WebSocket connection to Somnia is active and listening. When both players have that badge lit up and a raid fires, you can watch both screens react to the same on-chain event at the same moment. That is the Somnia Reactivity SDK doing exactly what it was built to do.

---

## 🔔 Somnia Reactivity — Full Subscription Map

Every real-time feature in DreamSiege is backed by a specific Somnia Reactivity subscription. Here is the complete map of what is listening and why.

### `GameContext.tsx`
| Subscription | Purpose |
| :--- | :--- |
| `subscribeToResourceTick` | Updates Credits, Biomass, Minera, and Vanguard in real-time as resources accumulate |
| `subscribeToResourcesCollected` | Triggers empire state refresh the moment a player collects resources on-chain |
| `subscribeToAllResolutions` | Writes battle results to Combat Archives and triggers victory/defeat modal for the connected player |
| `subscribeToIncomingAttack` | Fires the full-screen incoming raid overlay the instant an attacker targets you |

### `Siege.tsx`
| Subscription | Purpose |
| :--- | :--- |
| `subscribeToAllActivity` | Tracks live online presence — stamps every player as active when they perform any on-chain action |
| `subscribeToIncomingAttack` | Sets active battle state for the defender when a siege is launched against them |
| `subscribeToAllAttacks` | Sets active battle state for the attacker the moment their siege transaction confirms |
| `subscribeToAttackResolved` | Shows the battle result modal for both attacker and defender simultaneously |

### `Empire.tsx`
| Subscription | Purpose |
| :--- | :--- |
| `subscribeToUpgradeComplete` | Shows a toast and refreshes the empire grid the moment an upgrade finishes on-chain |
| `subscribeToUpgradeStarted` | Shows a toast and refreshes the empire grid immediately when an upgrade begins |
| `subscribeToBuildingPlaced` | Refreshes the empire grid instantly when a new building is placed |

### `App.tsx`
| Subscription | Purpose |
| :--- | :--- |
| `subscribeToAttackResolved` | Clears the incoming raid overlay and navigates to the Siege Chamber with the battle result the moment the battle resolves |

### `BattleLog.tsx`
| Subscription | Purpose |
| :--- | :--- |
| `subscribeToAllResolutions` | Reloads the Combat Archives instantly when any battle resolves on-chain — no polling needed |

### `Legends.tsx`
| Subscription | Purpose |
| :--- | :--- |
| `subscribeToRankingUpdated` | Refetches the leaderboard instantly when any player's ranking changes after a battle |
| `EmpireRegistered` (direct) | Refetches the leaderboard and updates the Empires Active count the moment a new empire registers |

### `GlobalBattleFeed.tsx`
| Subscription | Purpose |
| :--- | :--- |
| `subscribeToGlobalBattleEvents` | Feeds real-time battle events into the global ticker feed as they happen on-chain |

### `LiveEventFeed.tsx`
| Subscription | Purpose |
| :--- | :--- |
| `subscribeToAllResolutions` | Adds every battle resolution to the live activity feed in real time |

### `useGame.ts`
| Subscription | Purpose |
| :--- | :--- |
| `subscribeToRankingUpdated` | Triggers an immediate leaderboard data refresh when rankings change on-chain |

---

## ✨ Core Features

**Real-Time PvP Battle System** — Launch a siege against any player on the leaderboard. The moment your attack lands on-chain, the defender's screen flashes an INCOMING RAID alert no matter what page they are on. They have 3 minutes to intercept or watch their resources drain.

**Global Raid Overlay** — The incoming raid alert is a full-screen overlay that appears on any page — Empire, Hall of Legends, Battle Log — so defenders can never miss an attack. One tap takes them directly to the Siege Chamber to fight back.

**Pure Stat-Based Combat** — There is zero randomness. Who wins a battle is determined entirely by your buildings and resource composition. Vanguard troops beat Minera defenses. Biomass traps beat Credits. Credits counter Vanguard. This triangle makes every attack a strategic decision where a smarter smaller empire can defeat a larger careless one.

**Empire Building** — Players build and upgrade a 100-slot Citadel grid. Mines generate Credits. Lumber Mills produce Biomass. Quarries mine Minera. Barracks boost attack power. Walls and Towers strengthen defense. Every building is stored on-chain. Every upgrade costs real resources.

**Resource Economy** — Resources accumulate passively over time based on building levels. The ResourceVault contract tracks every player's Credits, Biomass, Minera, and Vanguard on-chain. Winning a raid transfers 15% of the loser's resources to the winner. A successful intercept costs the attacker a 5% penalty.

**Hall of Legends** — A live leaderboard showing the top commanders ranked by victories and loot earned. Players can raid anyone on the leaderboard directly with one click — even offline players, making top-ranked positions genuinely dangerous to hold.

**Live Online Presence** — The Siege Chamber shows which commanders are active right now. Any player who collected, built, attacked, or registered in the last 5 minutes appears with a teal Live indicator. Powered entirely by the Reactivity SDK — no polling.

**Combat Archives** — A full battle history for every player, enriched with on-chain transaction hashes. Every entry links directly to the Somnia explorer so results are independently verifiable. Export your entire battle history as a document.

---

## 📸 Screenshots

### Landing Page — Live On-Chain Stats
The landing page shows real-time data pulled directly from the Somnia network — active empires, total raids launched, and the current block number updating live as new blocks are produced.

### Global Incoming Raid Overlay
When an attack is launched, this full-screen overlay appears instantly on the defender's browser — powered by a Reactivity SDK WebSocket push — no matter what page they are currently viewing.

### Simultaneous Battle Result Modals
The most powerful moment in DreamSiege: both players see their victory or defeat modal at the same time, triggered by the same on-chain event pushed to both browsers simultaneously via the Reactivity SDK.

### Hall of Legends — Live Leaderboard
The leaderboard pulls real data from the Leaderboard contract and lets any player raid any commander with one click, even if they are offline.

> 📷 To add screenshots, place image files in a `/screenshots` folder in the repo root and reference them here using `![Description](screenshots/filename.png)`.

---

## 🏗️ How It Works — The Architecture

DreamSiege is built in two layers that talk to each other constantly.

The smart contract layer lives on Somnia Shannon Testnet and handles everything that needs to be trustless: resource balances, building levels, battle outcomes, loot transfers, and leaderboard stats. Five contracts work together — the Base Contract manages buildings and resource production, the Resource Vault holds all player wealth, the PvP Arena runs battles, the Leaderboard tracks rankings, and the Empire Registry stores player identities.

The frontend layer is a React app that uses Viem and Wagmi to read from and write to those contracts. But the special part is how it listens for changes. Instead of polling every few seconds, it uses the Somnia Reactivity SDK to subscribe to specific on-chain events. The moment a `ChallengeIssued` event fires on the PvP Arena contract, the SDK pushes it to every subscribed browser immediately. No polling. No delay. Pure push.

---

## 🔧 Technology Stack

The frontend is built with React and TypeScript, styled with Tailwind CSS, and bundled with Vite. Blockchain interactions use Viem for low-level contract calls and Wagmi for React hooks. Wallet connection is handled by RainbowKit. The real-time layer uses `@somnia-chain/reactivity` for WebSocket event subscriptions and `@somnia-chain/streams` as a fallback. Smart contracts are written in Solidity and compiled with Foundry.

---

## 📋 Contract Registry (Somnia Shannon Testnet)

| Contract | Address |
| :--- | :--- |
| **Base Contract** | `0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66` |
| **Resource Vault** | `0x15c18a11ca29e56a068fb21f4662129dbdbe20ba` |
| **PvP Arena** | `0xd8665b7f204b073843334d9747317829e5a83945` |
| **Leaderboard** | `0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b` |
| **Empire Registry** | `0x1d617cC33411562c0c25Ce35A1B6F08E92d74916` |
| **Rewards Distributor** | `0x9e05bB09A8ffE776585E61d5378cCd89DdA239d5` |

---

## 🌐 Network Configuration

To connect your wallet to Somnia Shannon Testnet, use these settings in MetaMask or any Web3 wallet.

**Network Name:** Somnia Shannon Testnet  
**Chain ID:** 50312  
**RPC URL:** https://dream-rpc.somnia.network  
**Explorer:** https://shannon-explorer.somnia.network  
**Faucet:** https://testnet.somnia.network  

---

## 🚀 Running Locally

Clone the repository and navigate into the frontend folder.

```bash
git clone https://github.com/Jayanng/dreamseige.git
cd dreamseige/frontend
```

Install dependencies and start the development server.

```bash
npm install --legacy-peer-deps
npm run dev
```

Open your browser at `http://localhost:5173` and connect a wallet configured for Somnia Shannon Testnet. If you need test STT tokens, visit the faucet at https://testnet.somnia.network.

To experience the real-time PvP, open two browser windows with two different wallets. Both wallets need to have initialized their Citadel and registered an Empire name. From one window, go to the Siege Chamber, add the other wallet's address as a target, and click SIEGE. Watch both screens react at the same moment — that simultaneous reaction is the Somnia Reactivity SDK working in real time.

---

## 🎯 The Somnia Reactivity Showcase

The single most important thing to understand about DreamSiege is that the Reactivity SDK is not an afterthought — it is the foundation. The game was designed specifically to demonstrate what becomes possible when a blockchain can push state changes to clients in real time.

In traditional blockchain games, the UI is passive. It asks the chain for updates. In DreamSiege, the UI is a live participant. When a battle happens on-chain, both players' browsers know about it within milliseconds — not because they asked, but because the Somnia network told them. The `subscribeToAllResolutions` listener in `GameContext.tsx` and the `subscribeToIncomingAttack` hook in `useReactivity.ts` are the beating heart of this system.

This is the future of on-chain gaming. DreamSiege is a proof of concept that it works today, on Somnia. Currently live on Somnia Shannon Testnet — mainnet deployment ready when the network launches.

---

*Built with ❤️ for the Somnia Network Hackathon.*
