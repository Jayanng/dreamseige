# 🏰 DreamSiege

A tactical, decentralized empire-building game built on the **Somnia Shannon Testnet**.

![Somnia](https://img.shields.io/badge/Blockchain-Somnia-blue)
![React](https://img.shields.io/badge/Frontend-React-61DAFB)
![Vite](https://img.shields.io/badge/Build-Vite-646CFF)

## 🌌 Overview

DreamSiege is a high-stakes strategy game where players register unique Empires, build strategic infrastructure, and raid opponents for glory and resources. Powered by the **Somnia Reactivity SDK**, the game features real-time resource generation and low-latency battle synchronization.

## 🚀 Key Features

### 🏛️ Decentralized Empire Registry
- Securely register and brand your unique Empire on-chain.
- Dynamic naming and badge systems.

### 🏗️ Strategic Building Grid
- Manage a 100-slot grid with specialized structures:
  - **Mines/Lumber Mills/Quarries**: Automated resource production.
  - **Barracks/Wall/Tower**: Tactical offensive and defensive power.
  - **Resource Vault**: High-security storage for accumulated wealth.

### ⚔️ PvP Arena & Siege System
- Real-time raiding system with tactical win probabilities.
- **Interception Mechanic**: Defenders can manually intercept incoming raids to gain the upper hand.
- **Global Battle Sync**: Decentralized battle logs that update simultaneously for both participants, regardless of their current page.

### ⚡ Real-time Reactivity
- Powered by the Somnia Reactivity SDK for instant state updates.
- Automated resource ticking and collection systems.

## 🛠️ Technology Stack

- **Smart Contracts**: Solidity (SomniaShannon Testnet)
- **Frontend**: React, TypeScript, Tailwind CSS
- **Reactivity**: Somnia Reactivity SDK (@somnia-chain/reactivity)
- **Blockchain Interface**: Viem, Wagmi, RainbowKit
- **Build Tool**: Vite

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Jayanng/dreamseige.git
   ```

2. **Navigate to the frontend**:
   ```bash
   cd frontend
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 📜 Contract Architecture

- **BaseContract**: Handles building placement, upgrades, and core empire stats.
- **ResourceVault**: Manages the decentralized treasury and resource generation.
- **PvPArena**: Orchestrates combat logic, interceptions, and raid resolutions.
- **Leaderboard**: Tracks the top commanders in real-time.

---

Built with ❤️ for the Somnia Shannon Testnet.
