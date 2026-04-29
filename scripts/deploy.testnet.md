# Testnet Deployment Commands

```sh
cargo install --locked stellar-cli --features opt
```

```sh
soroban network add testnet --rpc-url https://soroban-testnet.stellar.org --network-passphrase "Test SDF Network ; September 2015"
```

```sh
soroban keys generate deployer --network testnet
curl "https://friendbot.stellar.org?addr=$(soroban keys address deployer)"
```

```sh
cd contracts
cargo build -p token --release --target wasm32-unknown-unknown
cargo build -p voting --release --target wasm32-unknown-unknown
```

```sh
TOKEN_ID=$(soroban contract deploy --wasm target/wasm32-unknown-unknown/release/token.wasm --source deployer --network testnet)
echo "$TOKEN_ID"
```

```sh
VOTING_ID=$(soroban contract deploy --wasm target/wasm32-unknown-unknown/release/voting.wasm --source deployer --network testnet)
echo "$VOTING_ID"
```

```sh
soroban contract invoke --id "$TOKEN_ID" --source deployer --network testnet -- init --admin "$(soroban keys address deployer)" --name RewardToken --symbol RWD --decimals 7
```

```sh
soroban contract invoke --id "$VOTING_ID" --source deployer --network testnet -- init --admin "$(soroban keys address deployer)" --token_contract_id "$TOKEN_ID" --reward_amount 100000000
```

```sh
soroban contract invoke --id "$TOKEN_ID" --source deployer --network testnet -- set_admin --caller "$(soroban keys address deployer)" --new_admin "$VOTING_ID"
```

```sh
cd ..
cat > frontend/.env <<EOF
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_VOTING_CONTRACT_ID=$VOTING_ID
VITE_TOKEN_CONTRACT_ID=$TOKEN_ID
EOF
```

```sh
cd frontend
npm ci
npm run build
npx vercel --prod
```
