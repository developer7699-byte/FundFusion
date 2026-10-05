# API — NEXORA PAY

Base URL (local): `http://localhost:3001/api`  
Swagger: `http://localhost:3001/api/docs`

All successful envelopes:

```json
{ "success": true, "data": {}, "meta": { "simulated": true } }
```

Errors:

```json
{ "success": false, "error": { "code": "STRING", "message": "human readable" } }
```

## Ready in Phase 01

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/health` | public | Liveness |
| POST | `/auth/register` | public | Creates CUSTOMER |
| POST | `/auth/login` | public | Email + password |
| POST | `/auth/otp/request` | public | Mock OTP (logged server-side only in dev) |
| POST | `/auth/otp/verify` | public | Completes verification |
| POST | `/auth/refresh` | refresh token | Rotation |
| POST | `/auth/logout` | access | Invalidates refresh family |
| GET | `/auth/me` | access | Current user + roles |
| GET | `/customer/overview` | CUSTOMER | Simulated dashboard payload |
| GET | `/wallet` | CUSTOMER | Mock balances, addresses, activity |
| POST | `/wallet/deposits` | CUSTOMER | Mock deposit address |
| POST | `/wallet/deposits/:id/simulate-broadcast` | CUSTOMER | Fake incoming tx |
| POST | `/wallet/deposits/:id/simulate-confirm` | CUSTOMER | Fake confirmations then ledger credit |
| POST | `/wallet/send` | CUSTOMER | Mock send (available only) |
| POST | `/wallet/withdrawals` | CUSTOMER | Mock withdraw |
| POST | `/wallet/quotes` | CUSTOMER | Timed mock buy/sell/convert quote |
| POST | `/wallet/quotes/:id/accept` | CUSTOMER | Apply quote on mock ledger |
| GET | `/wallet/activity/:id` | CUSTOMER | Activity detail |

Phase 05–06 uses an **in-memory mock store**. No live chain, UPI, or bank calls. Locked USDT is not spendable.
