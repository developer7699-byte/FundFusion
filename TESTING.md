# Testing — NEXORA PAY

## Layers

- **API unit/e2e:** Jest (`api/`)
- **SPA e2e:** Playwright (Phase 20)
- **Manual:** each phase must be run locally before it is marked complete

## Phase 01 checklist

- [ ] `web` dev server starts
- [ ] Public landing and legal/marketing routes render
- [ ] Auth screens validate with Zod
- [ ] Customer shell routes navigate
- [ ] `api` health endpoint responds
- [ ] Login against seed user returns JWT (when DB is up)
- [ ] Dashboard overview uses simulated labels

Do not mark a phase complete if tests or the manual checklist fail.
