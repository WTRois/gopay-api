# Discrepancies Documentation — README vs Implementation

> Comparison of claims in `README.md` and repository documents against actual source code in `server.js`.

---

## 1. Discrepancies Summary

| #   | Topic                   | Documentation / README Claim                        | Actual Code Reality                                                                                           | Verdict & Action                                                    |
| --- | ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Runtime                 | Node.js v18+                                        | Node.js v20 (Docker), moving to Bun v1.4.2+                                                                   | Align docs with Bun runtime                                         |
| 2   | Statelessness           | Described as "Stateless" in package.json and README | Highly stateful via in-memory `Map` (`qrisStore`, `claimedTransactions`) and local cache files                | State is ephemeral and lost on restart; moving to persistent SQLite |
| 3   | QR Generation           | "Generate Dynamic QRIS"                             | Dynamic QR string is calculated locally via TLV, but image rendering relies on third-party `api.qrserver.com` | Replace external QR dependency with local pure-JS generator         |
| 4   | Authentication          | `x-api-key` header documented                       | Code also silently supports query parameter `?api_key=...` which leaks in access logs                         | Mark query param as deprecated and enforce headers                  |
| 5   | Double-Claim Prevention | Documented as strict anti-double claim              | In-memory `Map` cleanups every 24 hours, but process restart wipes all protection instantly                   | SQLite persistence provides durable unique constraints              |
| 6   | Transactions Endpoint   | `/transactions/all` documented as standard endpoint | Implemented using Express internal hack `app._router.handle`                                                  | Refactor to use a shared internal service function                  |
