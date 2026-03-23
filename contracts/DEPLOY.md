# DreamSiege Deployment Guide

## Prerequisites
- Foundry installed (`forge --version`)
- Wallet with STT on Somnia Shannon Testnet
- Minimum 32 SOM in the `PvPArena` contract for scheduling callbacks

## Environment Setup
1. Create `contracts/.env` from `contracts/.env.example`
2. Set your `DEPLOYER_PRIVATE_KEY`

## Deployment Steps

### 1. Build Contracts
```powershell
forge build
```

### 2. Deploy to Testnet
```powershell
forge script script/DeployDreamSiege.s.sol:DeployDreamSiege --rpc-url somnia_testnet --broadcast --verify --legacy -vvvv
```

### 3. Fund Handlers (CRITICAL)
Somnia Reactivity requires the handler contract (`PvPArena`) to have a balance to pay for callbacks.
```powershell
forge script script/FundHandlers.s.sol:FundHandlers --rpc-url somnia_testnet --broadcast
```

## Deployed Contract Registry

| Contract | Address |
| :--- | :--- |
| **BaseContract** | `0xb8C43C55587d4460f1Bd959074E5A1f0A3d4F735` |
| **ResourceVault** | `0x721978cbB41De6E7E4892638624b1E7152156F19` |
| **PvPArena** | `0xd6602F02E0B0DA759B84F85F815aF611820B0a22` |
| **LeaderboardContract** | `0x95396246b715Ff6a7Db39040E9be43Bdb5701b0b` |
| **EmpireRegistry** | `0x1d617cC33411562c0c25Ce35A1B6F08E92d74916` |
| **RewardsDistributor** | `0x9e05bB09A8ffE776585E61d5378cCd89DdA239d5` |

## Verification
Contracts are automatically verified on the [Shannon Explorer](https://shannon-explorer.somnia.network).
