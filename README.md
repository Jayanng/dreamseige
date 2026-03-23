# 🏰 DreamSiege — Real-Time PvP Strategy on Somnia Network

> **Build. Raid. Defend. All on-chain. All in real-time.**

DreamSiege is a fully on-chain player-versus-player strategy game built on the Somnia Network. Two players can go head-to-head in real time — one launches a siege, the other receives an instant alert and chooses to fight back or let their walls hold. Every resource, every battle, every loot transfer happens on-chain. No servers. No cheating. No delays.

The secret ingredient is the **Somnia Reactivity SDK** — a technology that lets the blockchain *push* events directly to both players' screens the moment they happen, instead of constantly asking "did something change yet?" This is what makes DreamSiege feel alive.

---

## 🎮 What Makes DreamSiege Special

Most blockchain games have a problem: they feel slow. You click something, you wait, you refresh. DreamSiege solves this by using Somnia's Reactivity SDK to deliver real-time push notifications straight to the browser — the same way a chat app pings you when a message arrives. When someone raids you, your screen lights up instantly. When a battle resolves, both players see the result at the same moment. This is what gaming on a 1,000,000 TPS blockchain actually feels like.

---

## ✨ Core Features

**Real-Time PvP Battle System** — Launch a siege against any player on the leaderboard. The moment your attack lands on-chain, the defender's screen flashes an INCOMING RAID alert no matter what page they're on. They have 3 minutes to intercept or watch their resources drain.

**Somnia Reactivity SDK Integration** — The entire notification system runs through `@somnia-chain/reactivity`. Both players receive `BattleResolved` and `ChallengeIssued` events via WebSocket push in real time. A live "REACTIVITY LIVE" badge on every screen confirms the connection is active.

**Global Raid Overlay** — The incoming raid alert is a full-screen overlay that appears on any page — Empire, Hall of Legends, Battle Log — so defenders can never miss an attack. One tap takes them directly to the Siege Chamber to fight back.

**Pure Stat-Based Combat** — There is zero randomness. Who wins a battle is determined entirely by your buildings and resource composition. A smarter player with a weaker base can still beat a stronger opponent by choosing the right target. Vanguard troops beat Minera defenses. Biomass traps beat Credits. Resources beat Vanguard. This triangle makes every attack a strategic decision.

**Empire Building** — Players build and upgrade a 100-slot Citadel grid. Mines generate Credits. Lumber Mills produce Biomass. Quarries mine Minera. Barracks boost attack power. Walls and Towers strengthen defense. Every building is stored on-chain. Every upgrade costs real resources.

**Resource Economy** — Resources accumulate passively over time based on building levels. The ResourceVault contract tracks every player's Credits, Biomass, Minera, and Vanguard on-chain. Winning a raid transfers 15% of the loser's resources to the winner. A successful intercept costs the attacker 5%.

**Hall of Legends** — A live leaderboard showing the top commanders ranked by victories and loot earned. Players can raid anyone on the leaderboard directly with one click — even offline players, making top-ranked positions genuinely dangerous to hold.

**Combat Archives** — A full battle history for every player, stored locally and enriched with on-chain transaction hashes. Every entry links directly to the Somnia explorer so results are independently verifiable. Export your entire battle history as a document.

---

## 🏗️ How It Works — The Architecture

DreamSiege is built in two layers that talk to each other constantly.

The **smart contract layer** lives on Somnia Shannon Testnet and handles everything that needs to be trustless: resource balances, building levels, battle outcomes, loot transfers, and leaderboard stats. Five contracts work together — the Base Contract manages buildings and resource production, the Resource Vault holds all player wealth, the PvP Arena runs battles, the Leaderboard tracks rankings, and the Empire Registry stores player identities.

The **frontend layer** is a React app that uses Viem and Wagmi to read from and write to those contracts. But the special part is how it *listens* for changes. Instead of polling every few seconds (which is slow and wasteful), it uses the Somnia Reactivity SDK to subscribe to specific on-chain events. The moment a `ChallengeIssued` event fires on the PvP Arena contract, the SDK pushes it to every subscribed browser immediately. No polling. No delay. Pure push.

---

## 🔧 Technology Stack

The frontend is built with React and TypeScript, styled with Tailwind CSS, and bundled with Vite. Blockchain interactions use Viem for low-level contract calls and Wagmi for React hooks. Wallet connection is handled by RainbowKit. The real-time layer uses `@somnia-chain/reactivity` for WebSocket event subscriptions and `@somnia-chain/streams` as a fallback. Smart contracts are written in Solidity and compiled with Foundry.

---

## 📋 Contract Registry (Somnia Shannon Testnet)

| Contract | Address |
| :--- | :--- |
| **Base Contract** | `0xDaf4406Ce895f4261FFaF4e665b9F49b71050A66` |
| **Resource Vault** | `0xa737c12dc5291cd67715e1cb5e0b04cfeb70ab3d` |
| **PvP Arena** | `0xd8665b7f204b073843334d9747317829e5a83945` |
| **Leaderboard** | `0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b` |
| **Empire Registry** | `0x1d617cC33411562c0c25Ce35A1B6F08E92d74916` |

---

## 🌐 Network Configuration

To connect your wallet to Somnia Shannon Testnet, use these settings:

**Network Name:** Somnia Shannon Testnet  
**Chain ID:** 50312  
**RPC URL:** https://dream-rpc.somnia.network  
**Explorer:** https://shannon-explorer.somnia.network  
**Faucet:** https://testnet.somnia.network  

---

## 🚀 Running Locally

First, clone the repository and navigate into it.

```bash
git clone https://github.com/Jayanng/dreamseige.git
cd dreamseige/frontend
```

Install dependencies and start the development server.

```bash
npm install
npm run dev
```

Open your browser at `http://localhost:5173`, connect a wallet configured for Somnia Shannon Testnet, and initialize your Citadel to begin playing. If you need test STT tokens, visit the faucet at https://testnet.somnia.network.

To test PvP, open two browser windows with two different wallets. Both should have initialized their Citadel and registered an Empire. From one window, add the other wallet's address as a target in the Siege Chamber and click SIEGE. Watch both screens react simultaneously.

---

## 🎯 The Somnia Reactivity Showcase

The single most important thing to understand about DreamSiege is that the Reactivity SDK is not an afterthought — it is the foundation. The game was designed specifically to demonstrate what becomes possible when a blockchain can push state changes to clients in real time.

In traditional blockchain games, the UI is passive. It asks the chain for updates. In DreamSiege, the UI is a live participant. When a battle happens on-chain, both players' browsers know about it within milliseconds — not because they asked, but because the Somnia network told them. The `subscribeToAllResolutions` listener in `GameContext.tsx` and the `subscribeToIncomingAttack` hook in `useReactivity.ts` are the beating heart of this system.

This is the future of on-chain gaming. DreamSiege is a proof of concept that it works today, on Somnia.

---

*Built with ❤️ for the Somnia Network Hackathon.*
