# Voting dApp (Soroban + React)

Terminal-style decentralized voting app on Stellar **Soroban** (Testnet), with **reward tokens** via inter-contract calls and a **real-time event feed**.

## Monorepo structure
- `contracts/`: Soroban smart contracts (Rust)
- `frontend/`: React + Vite UI
- `scripts/`: deploy/init scripts (local + CI friendly)

## Quickstart

### Prereqs
- Node.js 20+
- Rust toolchain
- Soroban CLI (installed + configured for Testnet)
- Freighter wallet (browser extension)

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Contracts
```bash
cd contracts
cargo test
```

## Deployment
After first deploy, we will update this README with:
- Live demo link
- CI badge
- Contract IDs + tx hashes (Voting + Token)
- Mobile screenshots
