# The test USDT contract

BSC testnet has no official Tether contract (`docs/DEPENDENCIES.md` §2.4), so
the deposit watcher needs a token of our own to watch. This is that token.

| | |
|---|---|
| **Address** | `0x15511d371397aBB0348d8a21E6010DEb3a41F6AB` |
| **Network** | BSC testnet (chain 97) |
| **Name / symbol** | Tether USD (FundFusion test) / `USDT` |
| **Decimals** | 18 — the same as BSC-USD on mainnet, and why the ledger column is `NUMERIC(38,18)` |
| **Initial supply** | 1,000,000 USDT, all to the gas wallet |
| **Owner** | `0x570ec515914CC54da8Ebc50c6AC69f0330727455` (the gas wallet, `m/44'/60'/0'/1/0`) |
| **Deploy tx** | `0x8e41ffa7f76e0dad072de9ad57fc9e386396f612d90ccae15645f3a81e2a7194` |
| **Block** | 143976666 |
| **Compiler** | solc 0.8.39, optimizer on, 200 runs |
| **Source** | [`api/contracts/TestUsdt.sol`](../../contracts/TestUsdt.sol) |
| **Deployed by** | `npm run chain:deploy-token --workspace api` |

Configured as `USDT_CONTRACT_ADDRESS` in `api/.env`. Nothing above the chain
seam knows this is a stand-in.

## Funding a test account

The owner holds the whole supply and `mint` is owner-only, so topping up a
deposit address is a transfer or a mint from the gas wallet. Both move real
testnet tokens, which is the point — a deposit the watcher credits has to be
a deposit that happened.

## Redeploying

The script compiles from source rather than from a committed hex blob, so a
fresh environment — or a testnet reset — runs the same command and gets a new
address. Replace `USDT_CONTRACT_ADDRESS` and the table above when that
happens; a stale address here is worse than none, because it looks checked.

## What this is not

Not an upgrade target, and deliberately without a pause, a blacklist or a
fee on transfer. A test token that behaves differently from the real one
hides the bugs it exists to find.

**This contract is worthless and exists only on testnet.** Mainnet uses the
real Tether contract, and that is a separate decision with a separate seed
(`docs/DEPENDENCIES.md` §2.5).
