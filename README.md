# Raven Launchpad

A multi-token launchpad (IDO) built on Stellar/Soroban. Contributors fund raises using native XLM. If the target is hit before the deadline, the launch succeeds and contributors claim project tokens. If not, everyone gets a full refund.

## Live Demo

> [https://raven-launchpad.vercel.app](https://raven-launchpad.vercel.app)

> 🎥 Demo Video: [Watch on YouTube](https://youtu.be/KjZI1uxUs2Y?si=NIVk09Sqj0ErFZl0)

---

## Screenshots

### Mobile Responsive UI
![Mobile Responsive View](app/screenshots/mobile-responsive.png)

### CI/CD Pipeline
![CI](https://github.com/Unyime12/raven-launchpad/actions/workflows/ci.yml/badge.svg)
![CI Screenshot](app/screenshots/ci-cd.png)

### Test Output
![Test Output](app/screenshots/test-output.png)

### Homepage
![Homepage](app/screenshots/homepage.png)

---

## How It Works

Raven Launchpad uses a simple raise-or-refund model across multiple simultaneous token launches:

1. A project sets a funding target and deadline in XLM
2. Contributors send XLM via `buy()` — contributions are tracked on-chain
3. If the target is reached before the deadline → state flips to **Success**; contributors call `claim()` to receive project tokens 1:1
4. If the deadline passes without hitting the target → state flips to **Expired**; contributors call `refund()` to get their XLM back

Each launch is an independent pair of Token + Launchpad contracts, registered in the frontend registry.

---

## Architecture

Two Soroban smart contracts power each launch, with a Next.js frontend on top.

```
.
├── contracts/
│   ├── launchpad/        # Core IDO logic — buy, claim, refund, state machine
│   └── token/            # Project token — mint, transfer, balance, allowance
└── app/                  # Next.js 14 frontend
    └── lib/
        └── launches.ts   # Multi-launch registry — add new projects here
```

### Contract Flow

Deploy token contract
Deploy launchpad contract
Initialize token  →  admin = launchpad contract address
Initialize launchpad  →  token, funding_token, target, deadline
Register both contract IDs in lib/launches.ts
Users call buy()  →  XLM transferred to launchpad, contribution tracked
If funded >= target  →  state flips to Success automatically
Users call claim()  →  launchpad mints project tokens 1:1 to contributor
If deadline passes without hitting target  →  state = Expired
Users call refund()  →  XLM returned to contributor


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

---

## Live Launches (Testnet)

| Launch | Token | Token Contract | Launchpad Contract | Soft Cap |
|---|---|---|---|---|
| RAVEN | RVN | `CAKYJF4FRQMF3VS43THFNXB3RWCOHOXUEQE6JRCTEBRRLBD2I5CR23PB` | `CCHUVB7C4VB4QT7XCFOQFAJI4GTJNZTZE37GQY5H3UK53EYISSEVWUKH` | 1,000 XLM |
| NORMIES | NORM | `CACCNZESK5YAQYYN5NLZLBEJNNPTTNN3H5YK6ICWXEL65UVLGVHNP534` | `CDWEL3QFJ52UNTZFQVM3O424VYC63STQPI7OIMNQ6G2DA5CCFJM5X4JT` | 50,000 XLM |
| CHIPS | CHIPS | `CBA5VCHI6NCZ7TSHWYB33F2DREB2FQ4TTYJWHSBQ6LCNUDQYA3R5TUC3` | `CD6Z2V73CB5XE7WFXWLINLNL5P6A6HRJHXLJMUP4EP46RI7PMX57OFZR` | 1,000 XLM |
| GOAT | GOAT | `CDNY3EF3MP5GR6VMXUYLHB7RGZ75M5C2RWD77TQONVOAVC4P57BTYVGS` | `CCA3OANHQFHR72S6IC4JDK66NAXLXONFIZLYUUPX23RNDU5FRSXTQGWU` | 5,000 XLM |
| PEPE | PEPE | `CBEZIUGR3NL4BIU32YLTZPW2TVPHT6UGUPX64RJCLNAMGSBFVOUDYV56` | `CAIPH3566FKQPLQ74ZNKPNF5O6CP7UC7BJZHPF65AZEOMGO5M4VH6SJ6` | 2,000 XLM |
| ROCKET | RKT | `CDWFVNRGEBVI4VLCXNQ6YUVCJ2CNBRA2IJO4HIASILAV5PDRXFCCMUV3` | `CB5ILLXVLOXFQK3EDYXJK6SPXZBAHE4JQFIOLEMTQBBUACMIY4FLU4NY` | 10,000 XLM |

**Funding Token (XLM SAC):** `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

---

## Testnet Transactions

### Inter-Contract Call — Claim (Launchpad → Token Mint)

| | |
|---|---|
| **Transaction** | `93af8aab7711c65e7272ef2f7f59ab7232f18e3d780e7e524d3c85c7858080c9` |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/93af8aab7711c65e7272ef2f7f59ab7232f18e3d780e7e524d3c85c7858080c9) |
| **Action** | Launchpad calls `token.mint()` via `authorize_as_current_contract` |

---

## Proof of User Interaction

The following wallets have interacted with Raven Launchpad contracts on Stellar Testnet:

| # | Address | Transaction Hash | View Tx |
|---|---|---|---|
| 1 | `GCGI3OXCYBO5JL63XQKJMQA6R5WZYY7XH3FBL2K7TYR7AKDZVPPZNGYC` | `201bf876185907305942da4228212b4ce573e89d98bf8df7eaa158c57b46a6e8` | [View](https://stellar.expert/explorer/testnet/tx/201bf876185907305942da4228212b4ce573e89d98bf8df7eaa158c57b46a6e8) |
| 2 | `GA5HS2GA4FJGDCEZGGAKNZJCCI6CCVKADS2XJ5663HXBC4SKCKXPTBCT` | `e32d769d954ec498f0b5ce7bbe5f257801ebc6c2bc6b8c136cd48cd3ceec0459` | [View](https://stellar.expert/explorer/testnet/tx/e32d769d954ec498f0b5ce7bbe5f257801ebc6c2bc6b8c136cd48cd3ceec0459) |
| 3 | `GDGIFF6OQXSCBI4YP47UVJMXMIVK2XHEZRQFMHXGAQJKBYSCONX7T2RA` | `e283f2ce8c724ff4e9d85bebf26b29db0c95fcc4d6a92f810968fe371ab55150` | [View](https://stellar.expert/explorer/testnet/tx/e283f2ce8c724ff4e9d85bebf26b29db0c95fcc4d6a92f810968fe371ab55150) |
| 4 | `GCPE6I7UYANN6GEGKQMYAB6Z2SHWW4VH6KCZ6S5H2X5ISW6YPGRIX3XJ` | `4c3371d0963c892b8556a9d8864a8f2e86ff48f35ec0e1919032545ac9430663` | [View](https://stellar.expert/explorer/testnet/tx/4c3371d0963c892b8556a9d8864a8f2e86ff48f35ec0e1919032545ac9430663) |
| 5 | `GAH7GVDG7GWJSMMVJB3ZSMGMEQQGYIA7WC6PRN5RPHNXEIBXOATUH6DU` | `a57146125f4fb01fd66476f9cf419233390677e1093601b648022ac7490a474e` | [View](https://stellar.expert/explorer/testnet/tx/a57146125f4fb01fd66476f9cf419233390677e1093601b648022ac7490a474e) |
| 6 | `GCJ24FIOJHEVF5N4CL72TGIUYCOCT7RPUME4Z4KJVD4VPA3EZMBYEXC7` | `e6b37c376378f126f371c11564999ac14d98be5970cf9f94ad3d63b7bd2afcad` | [View](https://stellar.expert/explorer/testnet/tx/e6b37c376378f126f371c11564999ac14d98be5970cf9f94ad3d63b7bd2afcad) |
| 7 | `GCZFAAOPONJZIRDLWGDES3MPDSPDKQPURWFB6UGG4SUH5C2SNFWLU2VD` | `bdf04dbe9fceee8e2a920ec5f962ee7aa01c867965b71f084fe0ed856fdd21b1` | [View](https://stellar.expert/explorer/testnet/tx/bdf04dbe9fceee8e2a920ec5f962ee7aa01c867965b71f084fe0ed856fdd21b1) |
| 8 | `GCA3VU6QFGA72JVIC7KIX3T7ATWWJIVMBKEIY7EGCNL36P2A4Z4NAMJU` | `3ddc9cfea992abb177ac82146f74ea6d2326b9c4788d03bf893ec33c44ac7c39` | [View](https://stellar.expert/explorer/testnet/tx/3ddc9cfea992abb177ac82146f74ea6d2326b9c4788d03bf893ec33c44ac7c39) |
| 9 | `GA6V47IENDB2NFPKDEQRYEBPROXS5YBYFDC26CG2J27CI5JA2UQ74KMN` | `23e6d7febf89092b6b11ef91d3c2adb180c4d92823bcbc21d9ebc427a09d273f` | [View](https://stellar.expert/explorer/testnet/tx/23e6d7febf89092b6b11ef91d3c2adb180c4d92823bcbc21d9ebc427a09d273f) |
| 10 | `GBE73MIWCVUSTIXFODKIDUFBPDKKWIJC7O7AYL7R4FV5SAPQSS7BV2W6` | `a6ca7bc12b6fcc2f5b3fb049639dd487c8354abf74714a825c06c1d772fb6cc4` | [View](https://stellar.expert/explorer/testnet/tx/a6ca7bc12b6fcc2f5b3fb049639dd487c8354abf74714a825c06c1d772fb6cc4) |
| 11 | `GBJQ4BBZLDEXDVVY7QLF6FXX7QRHDACYYTRSAMTA3JDOING5YA6W6GX4` | `0b0a5f6e2d41811ec268fcfda7a23ca34618cad1094a178cddac3752e1eb91f0` | [View](https://stellar.expert/explorer/testnet/tx/0b0a5f6e2d41811ec268fcfda7a23ca34618cad1094a178cddac3752e1eb91f0) |

> View all contract activity: [RAVEN Launchpad on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCHUVB7C4VB4QT7XCFOQFAJI4GTJNZTZE37GQY5H3UK53EYISSEVWUKH)

## User Onboarding & Feedback

New users: submit your wallet address and feedback via the form below.

> **[Fill out the Raven onboarding form →](https://forms.gle/P755KsAWrhKEfpbN8)**

> **Responses:** [CSV](docs/raven-feedback-responses.csv) · [Excel (.xlsx)](docs/raven-feedback-responses.xlsx)

## Adding a New Launch

There are two ways to launch a new token:

### Launch via Frontend 

1. Connect your wallet on the **Add Project** page (`/launch/new`)
2. Fill in token details (name, ticker, soft cap, liquidity %, tokens offered, deadline)
3. Click through the 4 on-chain steps in order:
   - Deploy Token Contract
   - Deploy Launchpad Contract
   - Initialize Token (admin = launchpad)
   - Initialize Launchpad
4. Once all 4 steps succeed, the launch is automatically saved and you're redirected to its live page — no manual file editing required

The frontend deploys new instances from an already-uploaded wasm hash (set via `NEXT_PUBLIC_TOKEN_WASM_HASH` / `NEXT_PUBLIC_LAUNCHPAD_WASM_HASH` env vars), then persists the launch to a small KV store so it appears on the homepage without a redeploy.

### Launch via CLI 


Each new project requires deploying a fresh Token + Launchpad pair. The wasm is already uploaded to testnet so you only need to deploy new instances:

```bash
# 1. Deploy new token instance from existing wasm hash
stellar contract deploy \
  --wasm-hash <TOKEN_WASM_HASH> \
  --source deployer \
  --network testnet
export TOKEN_ID=<printed_id>

# 2. Deploy new launchpad instance
stellar contract deploy \
  --wasm-hash <LAUNCHPAD_WASM_HASH> \
  --source deployer \
  --network testnet
export LAUNCHPAD_ID=<printed_id>

# 3. Initialize token — admin MUST be the launchpad address
stellar contract invoke --id $TOKEN_ID --source deployer --network testnet \
  -- initialize --admin $LAUNCHPAD_ID

# 4. Initialize launchpad
export FUNDING_TOKEN=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
export DEADLINE=1800000000  # Jan 15 2027

stellar contract invoke --id $LAUNCHPAD_ID --source deployer --network testnet \
  -- initialize \
  --token $TOKEN_ID \
  --funding_token $FUNDING_TOKEN \
  --target <TARGET_IN_STROOPS> \
  --deadline $DEADLINE

# 5. Register in lib/launches.ts
```

Then add an entry to `lib/launches.ts`:

```ts
{
  id: "launch-N",
  name: "PROJECT NAME",
  ticker: "TKR",
  launchpadId: "<LAUNCHPAD_ID>",
  tokenId: "<TOKEN_ID>",
  softCap: 1000,
  liquidity: 62.5,
  offered: "1900000 TKR",
  icon: "https://emojicdn.elk.sh/🚀?style=twitter",
}
```

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
target/wasm32-unknown-unknown/release/token.wasm

target/wasm32-unknown-unknown/release/launchpad.wasm

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
export DEADLINE=1800000000  # Jan 15 2027

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
