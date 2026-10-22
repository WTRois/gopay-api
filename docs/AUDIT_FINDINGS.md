# Audit Findings — GoPay Merchant Gateway

> Comprehensive security, reliability, architecture, and code quality audit findings.

---

## 1. Summary Matrix

| Finding ID | Category           | Description                                                                                                                                      | Severity    | Target Phase                        |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ----------------------------------- |
| SEC-01     | Security           | `login.js` & `sessionManager.js` heavily obfuscated                                                                                              | 🔴 Blocker  | Phase B/I (Wrap as black box)       |
| REL-01     | Reliability        | In-memory `Map` storage (`qrisStore`, `claimedTransactions`) lost on process restart                                                             | 🔴 Critical | Phase F (`bun:sqlite`)              |
| REL-02     | Reliability        | Race condition and false-positive risk in `verifyPayment()` with same amount                                                                     | 🔴 Critical | Phase G (Transaction claims)        |
| SEC-02     | Security           | Weak ID generation using `Math.random()` and timestamps                                                                                          | 🔴 Critical | Phase E (`crypto.randomUUID`)       |
| SEC-03     | Security / Privacy | Dynamic QR generation delegates to external URL (`api.qrserver.com`), leaking QRIS payload                                                       | 🟡 High     | Phase D (Local `qrcode` package)    |
| SEC-04     | Security           | Permissive CORS configuration (`cors()`) allowing all origins                                                                                    | 🟡 High     | Phase I / Middleware                |
| SEC-05     | Security / DoS     | No rate limiting on public and protected endpoints                                                                                               | 🟡 High     | Phase I / Middleware                |
| SEC-06     | Security           | Internal upstream error details and stack traces leaked to client responses                                                                      | 🟡 High     | Phase J (Centralized error handler) |
| SEC-07     | Security / SSRF    | Dynamic `checkout_url` trusts unvalidated incoming `Host` header                                                                                 | 🟡 High     | Phase E / Config                    |
| ARCH-01    | Architecture       | Monolithic [server.js](file:///Users/bidang4/Documents/GitHub/gopay-api/server.js) (737 lines) mixing routes, HTML, TLV QRIS, and business logic | 🟡 High     | Phase C (Modular structure)         |
| ARCH-02    | Architecture       | Internal router hack: `app._router.handle` used in `/transactions/all`                                                                           | 🟡 Medium   | Phase C (Shared service)            |
| SEC-08     | Security           | API Key accepted via query string (`?api_key=...`), prone to access log leaks                                                                    | 🟡 Medium   | Phase I (Header enforcement)        |
| REL-03     | Reliability        | Missing graceful shutdown (SIGINT/SIGTERM handlers)                                                                                              | 🟡 Medium   | Phase B / Server                    |
| QA-01      | Quality            | Zero automated unit or integration tests                                                                                                         | 🟡 High     | Phase N (`bun test`)                |
| OPS-01     | DevOps             | Docker image runs as root, lacks `.dockerignore`, and lacks persistent volume bindings                                                           | 🟡 Medium   | Phase M (Bun Docker Compose)        |

---

## 2. Detailed Findings

### 2.1 [SEC-01] Obfuscated Codebase Files

- **Location**: [login.js](file:///Users/bidang4/Documents/GitHub/gopay-api/login.js), [sessionManager.js](file:///Users/bidang4/Documents/GitHub/gopay-api/sessionManager.js)
- **Impact**: Code cannot be safely audited for secret leakages, unpinned dependencies, or memory leaks.
- **Mitigation**: Verified working on Bun 1.4.2 runtime. Wrap with clean service interfaces (`src/services/sessionService.js`) and treat as black-box components.

### 2.2 [REL-01] Ephemeral In-Memory State

- **Location**: [server.js](file:///Users/bidang4/Documents/GitHub/gopay-api/server.js#L18-L20)
- **Impact**: Server restarts or crashes lose all pending QRIS payments and claimed transaction records, resulting in untracked payments or double-spending.
- **Remediation**: Migrate to `bun:sqlite` with WAL mode and foreign key constraints.

### 2.3 [SEC-03] External QR Service Dependency & Information Disclosure

- **Location**: [server.js](file:///Users/bidang4/Documents/GitHub/gopay-api/server.js#L309)
- **Impact**: QR code image URL references `https://api.qrserver.com/v1/create-qr-code/?data=...`, sending raw merchant QRIS payloads to a third-party server. Also causes failure if offline or third-party service is down.
- **Remediation**: Replace with native `qrcode` generator in pure JS, returning SVG / Data URI directly without external network calls.

### 2.4 [REL-03] Missing Graceful Shutdown

- **Location**: [server.js](file:///Users/bidang4/Documents/GitHub/gopay-api/server.js#L734)
- **Impact**: Unhandled SIGTERM/SIGINT interrupts in-flight transactions abruptly.
- **Remediation**: Add explicit signal handlers closing the HTTP server and database connections gracefully.
