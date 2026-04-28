# Deploy to Stellar Testnet (Soroban)

This repo assumes you deploy **Token** first, then **Voting**, then set the token admin to the voting contract so voting can mint rewards.

## Prereqs
- `soroban` CLI installed
- funded Testnet account

## Suggested environment variables
- `SOROBAN_RPC_URL=https://soroban-testnet.stellar.org`
- `SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"`
- `SOROBAN_ACCOUNT=<your_testnet_address>`

## Build contracts
```bash
cd contracts
cargo build -p token --release --target wasm32-unknown-unknown
cargo build -p voting --release --target wasm32-unknown-unknown
```

## Deploy Token contract
```bash
TOKEN_WASM=target/wasm32-unknown-unknown/release/token.wasm

# Example (flags vary by soroban-cli version):
# soroban contract deploy --wasm $TOKEN_WASM --source $SOROBAN_ACCOUNT --rpc-url $SOROBAN_RPC_URL --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE"
```

## Initialize Token
Call `init(admin,name,symbol,decimals)` and keep `admin` as your account for setup.

## Deploy Voting contract
```bash
VOTING_WASM=target/wasm32-unknown-unknown/release/voting.wasm
```

## Initialize Voting
Call `init(admin, token_contract_id, reward_amount)`.

## Hand over mint authority to Voting
Call `token.set_admin(admin, voting_contract_address)` so `voting.vote(...)` can mint rewards.

## Seed proposals
Call `voting.set_proposal(admin, id, title)` for each proposal.

