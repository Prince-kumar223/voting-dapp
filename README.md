# Voting dApp (Soroban + React)

> CI: add your repo URL to enable the badge below.

![CI](https://github.com/REPLACE_ME/REPLACE_ME/actions/workflows/ci.yml/badge.svg)

Terminal-style decentralized voting app on Stellar **Soroban** (Testnet), with **reward tokens** via inter-contract calls and a **real-time event feed**.

## Monorepo structure
- `contracts/`: Soroban smart contracts (Rust)
- `frontend/`: React + Vite UI
- `scripts/`: deploy/init scripts (local + CI friendly)

## Architecture (high level)
- **Voting contract**: stores proposals + one-vote-per-wallet guard; emits `vote_cast`; calls token `mint` atomically.
- **Token contract**: SEP-41-style primitives (`balance`, `transfer`, allowances) plus admin `mint`; emits `tokens_rewarded`.
- **Frontend**: Freighter wallet connect + Soroban RPC integration; event feed polls `getEvents` with cursor pagination + dedupe.

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

## Frontend environment variables
- `VITE_SOROBAN_RPC_URL` (default: `https://soroban-testnet.stellar.org`)
- `VITE_VOTING_CONTRACT_ID` (after deploy)
- `VITE_TOKEN_CONTRACT_ID` (after deploy)
- `VITE_EVENT_START_LEDGER` (optional; default `0`)

## Deployment
After first deploy, we will update this README with:
- Live demo link
- CI badge (replace placeholder repo in badge URL)
- Contract IDs + tx hashes (Voting + Token)
- Mobile screenshots

See [scripts/deploy.testnet.md](scripts/deploy.testnet.md).

## Contract addresses (fill after deploy)
- **Voting contract**: `<VOTING_CONTRACT_ID>`
- **Token contract**: `<TOKEN_CONTRACT_ID>`
- **Deploy tx hash**: `<TX_HASH>`
