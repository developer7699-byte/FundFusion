# CLAUDE.md

Project instructions. Every agent working in this repository — including
subagents — must follow these rules exactly.

Shared working rules live in [`AGENTS.md`](AGENTS.md). Read it too.

## Commit rules

**These are hard rules. Do not deviate.**

1. **Never** add a `Co-Authored-By:` trailer, or any other co-author or
   attribution line, to a commit message.
2. Commit messages are **short and simple**, one line, conventional-commit
   shaped:

   ```
   feat(context): message
   fix(context): message
   ```

   No body unless the change genuinely cannot be understood without one.

Examples:

```
feat(ledger): add balanced journal posting
fix(auth): reject expired refresh tokens
chore(web): remove out-of-scope utility routes
```

## The spec

[`docs/PRD.md`](docs/PRD.md) is the specification for phase 1 (v1). It wins
over every reference document, including anything in `docs/archive/`.

- Milestones: PRD §14
- Definition of done: PRD §15
- **Scope boundaries: PRD §3.** Gift cards, game top-ups, utilities, UPI QR
  scan-and-pay, verification tiers and staking are not in v1. Do not build
  them, and do not leave routes or tables for them lying around.

## Money rules — non-negotiable

From PRD §5. No feature may bypass these.

1. **The ledger is the only truth.** Balances derive from balanced double-entry
   journals. No code ever writes a balance column directly — an admin
   correction is a compensating journal entry like any other movement.
2. **Every money operation is atomic, idempotent and auditable.** Money
   mutations require an `Idempotency-Key`.
3. USDT is `NUMERIC(38,18)`, INR is `NUMERIC(20,2)`. Money crosses the
   application boundary as **strings** and is computed with a decimal library.
   A JavaScript `number` never holds money.
4. Never mock PostgreSQL in a ledger or matching test. The behaviour under test
   is the database's row locking.

## Docs layout

```
docs/PRD.md           the spec
docs/DEPENDENCIES.md  what the client must supply, and when it blocks
docs/decisions/       grilling rounds and the original idea doc
docs/archive/         superseded, never authoritative
questions/            open questions — see AGENTS.md for the workflow
```
