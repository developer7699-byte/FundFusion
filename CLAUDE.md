# CLAUDE.md

Project instructions. Every agent working in this repository — including
subagents — must follow these rules exactly.

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

## Project

Phase 1 is the v1 PRD in `PRD.md`. It wins over every reference document.
Milestones are PRD §14. Scope boundaries are PRD §3 — gift cards, game
top-ups, utilities, UPI QR scan-and-pay, verification tiers and staking are
**not** in v1.
