# 🐦 Raven Launchpad

A decentralized token launchpad (IDO) built on Stellar/Soroban. Contributors fund a raise using native XLM. If the target is hit before the deadline, the launch succeeds and contributors claim project tokens. If not, everyone gets a full refund.

## Live Demo

> [https://raven-launchpad.vercel.app](https://raven-launchpad.vercel.app)

---

## Screenshots

### Mobile Responsive UI
> ![Mobile Responsive View](app/screenshots/mobile-responsive.png)

### CI/CD Pipeline
![CI](https://github.com/youthisguy/s_token_launchpad/actions/workflows/ci.yml/badge.svg)

> ![CI Screenshot](app/screenshots/CI_CD.png)

---

## How It Works

Sparrow Launchpad uses a simple raise-or-refund model:

1. A project sets a funding target and deadline in XLM
2. Contributors send XLM via `buy()` — contributions are tracked on-chain
3. If the target is reached before the deadline → state flips to **Success**; contributors call `claim()` to receive project tokens 1:1
4. If the deadline passes without hitting the target → state flips to **Expired**; contributors call `refund()` to get their XLM back

---

## Architecture

Two Soroban smart contracts power the protocol, with a Next.js frontend on top.

```
.
├── contracts/
│   ├── launchpad/        # Core IDO logic — buy, claim, refund, state machine
│   └── token/            # Project token — mint, transfer, balance, allowance
└── app/                  # Next.js 14 frontend
```

### Contract Flow

```
1. Deploy token contract
2. Deploy launchpad contract
3. Initialize token  →  admin = launchpad contract address
4. Initialize launchpad  →  token, funding_token, target, deadline
5. Users call buy()  →  XLM transferred to launchpad, contribution tracked
6. If funded >= target  →  state flips to Success automatically
7. Users call claim()  →  launchpad mints project tokens 1:1 to contributor
8. If deadline passes without hitting target  →  state = Expired
9. Users call refund()  →  XLM returned to contributor
```

### Inter-Contract Communication

The key design pattern is the launchpad contract minting tokens on behalf of users after a successful raise. This uses Soroban's `authorize_as_current_contract` to pre-authorize the cross-contract mint call:

```rust
env.authorize_as_current_contract(vec![
    &env,
    InvokerContractAuthEntry::Contract(SubContractInvocation {
        context: ContractContext {
            contract: token_addr.clone(),
            fn_name: Symbol::new(&env, "mint"),
            args: (caller.clone(), balance).into_val(&env),
        },
        sub_invocations: vec![&env],
    }),
]);
```

This eliminates the need for users to sign a separate mint approval — the launchpad handles authorization atomically within the claim transaction.

---

## State Machine

```
                    ┌─────────┐
                    │ Running │  timestamp < deadline && funded < target
                    └────┬────┘
                         │ funded >= target
                         ▼
                    ┌─────────┐
                    │ Success │  claim() available
                    └─────────┘

                    ┌─────────┐
                    │ Expired │  timestamp >= deadline && funded < target
                    └─────────┘  refund() available
```

---

## Contract Addresses (Testnet)

| Contract | Address |
|---|---|
| Token | `CB5VGFF6XPOYTN6SEQ5OE3DQBDYGULNECDYMK3CTOR4DL5NIVIEWRPVR` |
| Launchpad | `CCHUVB7C4VB4QT7XCFOQFAJI4GTJNZTZE37GQY5H3UK53EYISSEVWUKH` |
| Funding Token (XLM SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

---

## Testnet Transactions

### Inter-Contract Call — Claim (Launchpad → Token Mint)

| | |
|---|---|
| **Transaction** | `fadc55b6446caddb9aaf53fb0ca81fb0e83dac9be7dc9bf3c0c6978d1027d84f` |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/fadc55b6446caddb9aaf53fb0ca81fb0e83dac9be7dc9bf3c0c6978d1027d84f) |
| **Action** | Launchpad calls `token.mint()` via `authorize_as_current_contract` |

---

## Contract API

### Launchpad

| Function | Description |
|---|---|
| `initialize(token, funding_token, target, deadline)` | Configure the raise parameters |
| `buy(buyer, amount)` | Contribute XLM to the raise |
| `claim(caller)` | Claim project tokens after a successful raise |
| `refund(caller)` | Retrieve XLM after an expired raise |
| `get_state()` | Returns `0` (Running), `1` (Success), or `2` (Expired) |
| `get_funded()` | Total XLM raised so far (in stroops) |
| `get_target()` | Raise target (in stroops) |
| `get_buyer_balance(buyer)` | Individual contribution amount |

### Token

| Function | Description |
|---|---|
| `initialize(admin)` | Set admin — must be the launchpad contract address |
| `mint(to, amount)` | Mint tokens — only callable by admin (launchpad) |
| `balance(addr)` | Get token balance for an address |
| `transfer(from, to, amount)` | Transfer tokens between addresses |
| `total_supply()` | Total tokens minted |
| `approve(owner, spender, amount)` | Approve a spender allowance |
| `allowance(owner, spender)` | Check spender allowance |

---

## Getting Started

### Prerequisites

- Rust + `wasm32-unknown-unknown` target
- Stellar CLI
- Node.js 20+

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli --features opt
```

### Build Contracts

```bash
cargo clean && cargo build --target wasm32-unknown-unknown --release
```

Compiled `.wasm` files output to:

```
target/wasm32-unknown-unknown/release/token.wasm
target/wasm32-unknown-unknown/release/launchpad.wasm
```

### Deploy to Testnet

```bash
# Set up and fund identity
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet
export DEPLOYER=$(stellar keys address deployer)

# Deploy contracts
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/token.wasm \
  --source deployer --network testnet
export TOKEN_ID=<printed_id>

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/launchpad.wasm \
  --source deployer --network testnet
export LAUNCHPAD_ID=<printed_id>

# Initialize token — admin MUST be the launchpad address
stellar contract invoke --id $TOKEN_ID --source deployer --network testnet \
  -- initialize --admin $LAUNCHPAD_ID

# Initialize launchpad
export FUNDING_TOKEN=$(stellar contract id asset --asset native --network testnet)
export DEADLINE=$(( $(date +%s) + 86400 ))

stellar contract invoke --id $LAUNCHPAD_ID --source deployer --network testnet \
  -- initialize \
  --token $TOKEN_ID \
  --funding_token $FUNDING_TOKEN \
  --target 10000000 \
  --deadline $DEADLINE
```

### Run the Frontend

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Testing the Full Flow

```bash
# 1. Contribute 1 XLM (10,000,000 stroops)
stellar contract invoke --id $LAUNCHPAD_ID --source deployer --network testnet --send yes \
  -- buy --buyer $DEPLOYER --amount 10000000

# 2. Check raise state (1 = Success if target was met)
stellar contract invoke --id $LAUNCHPAD_ID --source deployer --network testnet \
  -- get_state

# 3. Claim project tokens
stellar contract invoke --id $LAUNCHPAD_ID --source deployer --network testnet --send yes \
  -- claim --caller $DEPLOYER

# 4. Verify token balance
stellar contract invoke --id $TOKEN_ID --source deployer --network testnet \
  -- balance --addr $DEPLOYER

# 5. Attempt double-claim (expected to fail: "no tokens to claim")
stellar contract invoke --id $LAUNCHPAD_ID --source deployer --network testnet \
  -- claim --caller $DEPLOYER
```

---

## CI/CD

GitHub Actions runs on every push to `main`:

```yaml
# .github/workflows/ci.yml
- Build and lint contracts (Rust/Soroban)
- Run Soroban unit tests (3+ passing)
- Build Next.js frontend
- Deploy to Vercel on success
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Rust, Soroban SDK 21 |
| Blockchain | Stellar Testnet |
| Frontend | Next.js 14, TypeScript |
| Styling | Tailwind CSS v4 |
| Wallet Integration | `@creit.tech/stellar-wallets-kit` |
| Animations | Framer Motion |
| Deployment | Vercel |
| CI/CD | GitHub Actions |