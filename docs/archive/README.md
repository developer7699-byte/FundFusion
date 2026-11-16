# Archive

Superseded material, kept only because it is not recoverable from git history.

| File | What it is | Superseded by |
|---|---|---|
| `PRD-2026-10-22.md` | First PRD draft, written before the November grilling rounds | `docs/PRD.md` |
| `grilling-2026-10-22.md` | The October grilling session | `docs/decisions/grilling.md` |
| `questions-2026-10-22/` | The October questions page and its data | `questions/` at the repo root |

Nothing here is authoritative. `docs/PRD.md` wins over every document in this
folder.

The prototype-era docs — `BLUEPRINT.md`, `PROJECT_STATE.md`, `ARCHITECTURE.md`,
`DATABASE.md`, `API.md`, `TESTING.md`, `SECURITY.md` — were deleted rather than
archived, because they are in git history and describe the mock-rails prototype
that `docs/PRD.md` replaces. Recover any of them with:

```bash
git show 3cbde3d:BLUEPRINT.md
```
