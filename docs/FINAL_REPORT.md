# Final Report — Refactor GoPay Merchant Gateway ke Bun

> Laporan akhir sesuai struktur yang diminta [TODO.md §20](./TODO.md).
> Tanggal: 2026-10-24 · Runtime: Bun v1.4.3 · Status: **SELESAI** (dengan known issues §15)

---

## 1. Ringkasan Refactor

- Monolit `server.js` Node.js (737 baris: routes, HTML, TLV QRIS, business logic) dipecah menjadi struktur modular `src/` (app, config, middleware, routes, services, storage, utils, web).
- Runtime Node.js → **Bun v1.4.3** (pinned); Express 4.x dipertahankan.
- State in-memory (`qrisStore`, `claimedTransactions` Map) → **`bun:sqlite` WAL** dengan klaim transaksi atomik.
- Render QR via API pihak ketiga (`api.qrserver.com`) → **generator `qrcode` lokal** (DataURL/PNG, 0 panggilan jaringan keluar).
- ID lemah (`Math.random()` + timestamp) → ID kripto (`src/utils/ids.js`).
- Error handling terpusat tanpa kebocoran stack trace; body limit 100kb.
- Single-flight request coalescing + TTL cache untuk upstream Gojek.
- Docker multi-stage non-root + healthcheck native; suite test `bun:test` (37 tests).
- `login.js` & `sessionManager.js` (obfuscated) dipertahankan sebagai black-box di balik antarmuka bersih (`src/services/sessionService.js`).
- `server.js` root menjadi shim kompatibilitas → `src/server.js`.

## 2. Versi Bun

- **Bun v1.4.3** (stable, pinned di `Dockerfile`: `oven/bun:1.4.3-alpine`).
- Minimum: Bun ≥ 1.4.0. `login.js`/`sessionManager.js` terverifikasi kompatibel pada Bun 1.4.2+.

## 3. Struktur Direktori Akhir

```
gopay-api/
├── src/
│   ├── app.js                    # Inisialisasi Express + middleware + mount routes
│   ├── server.js                 # Entrypoint + graceful shutdown (HTTP + DB)
│   ├── healthcheck.js            # Healthcheck native Docker
│   ├── config/env.js             # Skema & default environment
│   ├── middleware/               # apiKey.js, errorHandler.js
│   ├── routes/                   # health, logs, qris, payment, transactions
│   ├── services/                 # paymentService, qrisService, sessionService,
│   │                             # transactionService, upstreamClient
│   ├── storage/                  # database.js (bun:sqlite), migrations.js,
│   │                             # paymentRepository.js
│   ├── utils/                    # ids.js, logger.js, validation.js
│   └── web/                      # checkout.js (template UI checkout)
├── tests/unit + tests/integration
├── docs/                         # API_CONTRACT, AUDIT_FINDINGS, BENCHMARK,
│                                 # DISCREPANCIES, TODO, FINAL_REPORT
├── data/                         # gateway.sqlite (WAL)
├── login.js / sessionManager.js  # Black-box upstream (obfuscated)
├── server.js                     # Shim kompatibilitas → src/server.js
└── Dockerfile, docker-compose.yml, biome.json, bun.lock
```

## 4. Dependency

| Status            | Package                                                    | Catatan                                        |
| ----------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Dipertahankan     | axios ^1.7.2, cors ^2.8.5, dotenv ^16.4.5, express ^4.18.3 | Fungsional tetap sama                          |
| Ditambahkan       | qrcode ^1.5.4                                              | Render QR lokal (pengganti `api.qrserver.com`) |
| Dihapus           | nodemon (devDep)                                           | Digantikan `bun --watch`                       |
| Ditambahkan (dev) | @biomejs/biome ^2.6.2                                      | Linter/formatter                               |

## 5. Endpoint & Kompatibilitas

| Endpoint                     | Auth    | Status                                     |
| ---------------------------- | ------- | ------------------------------------------ |
| GET `/`                      | publik  | ✔ kompatibel (status plain text)           |
| GET `/health`, `/api/health` | publik  | ✔ struktur JSON terjaga                    |
| GET `/token-status`          | api key | ✔                                          |
| GET `/api/logs`              | api key | ✔                                          |
| GET/POST `/create-qris`      | api key | ✔ (amount integer + min/max)               |
| GET `/qr/:id`                | publik  | ✔ checkout page + `?format=raw` PNG mentah |
| GET `/api/qr-status/:id`     | publik  | ✔ polling checkout                         |
| GET/POST `/check-payment`    | api key | ✔ klaim atomik per TRX-ID                  |
| GET `/transactions`          | api key | ✔ (tanpa hack `app._router`)               |
| GET `/transactions/all`      | api key | ✔ service bersama                          |

Kompatibilitas diverifikasi 37 test unit/integration (semua PASS) + kontrak [API_CONTRACT.md](./API_CONTRACT.md).

## 6. Perbaikan QRIS & Verifikasi Transaksi

- QRIS dinamis EMVCo TLV + CRC16 dihitung lokal; render 100% lokal via `qrcode` (Data URL di checkout page, PNG mentah via `?format=raw`).
- ID pembayaran memakai crypto (`src/utils/ids.js`), bukan `Math.random()` + timestamp.
- Validasi nominal ketat: integer, rentang `MIN_AMOUNT`–`MAX_AMOUNT` (default 1–10.000.000); desimal & invalid ditolak.
- Klaim transaksi atomik: tabel `transaction_claims` dengan `upstream_transaction_id` sebagai PRIMARY KEY di dalam transaksi SQLite — proteksi double-claim bertahan lintas restart.
- Status ambigu tidak dinyatakan PAID; status PAID masuk terminal cache.

## 7. Database & Migrasi Data

- Engine: `bun:sqlite`; `PRAGMA journal_mode = WAL`, `synchronous = NORMAL`, `foreign_keys = ON` (`:memory:` saat `NODE_ENV=test`).
- Lokasi: `data/gateway.sqlite` (override via `DB_PATH`).
- Skema (migrasi v1 `initial_schema`): `payments` (id PK, trx_id UNIQUE, amount, qris_payload, status, created_at, expires_at, paid_at, upstream_transaction_id, payment_metadata) dan `transaction_claims` (upstream_transaction_id PK, payment_id, claimed_at) + index status/expires/trx_id.
- Migrasi v2 `relax_transaction_claims_fk`: rebuild tabel tanpa foreign key ketat, idempotent.
- Versi skema dilacak via `PRAGMA user_version`; migrasi berjalan otomatis saat startup.
- State lama in-memory bersifat ephemeral — tidak ada data historis yang perlu/dapat dimigrasi.
- Graceful shutdown menutup koneksi database.

## 8. Perbaikan Keamanan

| Finding                        | Status                                                       |
| ------------------------------ | ------------------------------------------------------------ |
| SEC-02 ID lemah                | ✔ fixed — crypto IDs                                         |
| SEC-03 QR pihak ketiga         | ✔ fixed — render lokal                                       |
| SEC-06 stack trace bocor       | ✔ fixed — errorHandler terpusat, detail hanya di development |
| REL-03 graceful shutdown       | ✔ fixed — SIGINT/SIGTERM tutup HTTP + DB                     |
| ARCH-02 hack `app._router`     | ✔ fixed — service bersama                                    |
| SEC-04 CORS allow-all          | ⚠ masih `cors()` terbuka — known issue §15                   |
| SEC-05 rate limiting           | ⚠ belum diimplementasikan — known issue §15                  |
| SEC-08 api_key di query string | ⚠ masih diterima (kompatibilitas, terdokumentasi di README)  |
| SEC-01 file obfuscated         | ⚠ by design — black-box dengan interface test                |

Tambahan: body limit 100kb (`express.json`/`urlencoded`), middleware `apiKeyAuth` untuk endpoint sensitif, endpoint polling publik terpisah dari endpoint privat.

## 9. Polling & Pengukuran Request Upstream

- Single-flight coalescing: 10 poll konkuren pada pembayaran sama → **1 request upstream**.
- TTL cache `UPSTREAM_CACHE_TTL_MS` (default 5 detik) untuk poll berulang.
- Terminal cache untuk status PAID (0 panggilan upstream setelah lunas).
- Auto-refresh token background tiap 6 jam oleh `sessionManager`.
- Rincian before/after: [BENCHMARK.md §4](./BENCHMARK.md).

## 10. Docker & Persistent Volume

- Multi-stage build (base → dependencies → runner), pinned `oven/bun:1.4.3-alpine`, `bun install --frozen-lockfile --production`.
- Non-root `USER bun`; `HEALTHCHECK` native `src/healthcheck.js`; image ~52 MB.
- `docker-compose.yml`: `restart: unless-stopped`, `env_file: .env`, volume `./data:/app/data` untuk SQLite, dan mount file sesi `./.GOPAY_SESI_JANGAN_DIHAPUS.json` (diperbaiki saat penyusunan laporan ini — sebelumnya tidak di-mount padahal README mengklaimnya; tanpa mount, sesi login hilang saat container di-recreate).
- Wajib penyimpanan persisten; serverless ephemeral (Render Free, Vercel) tidak didukung.

## 11. Hasil Test: PASS, FAIL, NOT RUN

- **PASS:** 37 tests / 126 assertions / 11 file (`bun test`, ±1,3 s, Bun v1.4.3, dijalankan lokal 2026-10-24). Mencakup: QRIS (TLV/CRC/ID kuat), payment & klaim atomik, persistence SQLite, kontrak API (auth header/query, error handling tanpa leak), session manager interface, caching & single-flight upstream.
- **FAIL:** 0.
- **NOT RUN:** login OTP interaktif (butuh nomor HP + OTP live), panggilan upstream Gojek live (test memakai mock/jalur tanpa sesi), benchmark produksi penuh (hasil terdokumentasi di BENCHMARK.md).

## 12. Hasil Benchmark

Merujuk [BENCHMARK.md](./BENCHMARK.md) (macOS arm64 + Docker, `scripts/benchmark.js`):

| Metrik                            | Node v20 (baseline) | Bun v1.4.3            | Perbaikan     |
| --------------------------------- | ------------------- | --------------------- | ------------- |
| Docker image                      | ~210 MB             | 52 MB                 | -75%          |
| RSS                               | ~38–55 MB           | 4,56 MB               | -88–91%       |
| Startup container                 | ~1,5–2,5 s          | ~180 ms               | ~10x          |
| Latensi `/health` p50 / p95 / p99 | —                   | 0,07 / 0,19 / 0,65 ms | (300 request) |

## 13. Environment Variables

| Variabel                      | Wajib | Default             | Keterangan                           |
| ----------------------------- | ----- | ------------------- | ------------------------------------ |
| `API_KEY`                     | ✔     | —                   | Kunci endpoint privat                |
| `QRIS_STATIC`                 | ✔     | —                   | QRIS statis dari GoBiz               |
| `GOPAY_MERCHANT_ID`           | ✔     | —                   | Merchant ID GoBiz                    |
| `PUBLIC_BASE_URL`             | ✔     | —                   | Base URL untuk link checkout         |
| `PORT`                        | —     | 3000                | Port HTTP                            |
| `QRIS_EXPIRY_MS`              | —     | 300000              | Masa berlaku QRIS (5 menit)          |
| `MIN_AMOUNT` / `MAX_AMOUNT`   | —     | 1 / 10000000        | Rentang nominal                      |
| `DB_PATH`                     | —     | data/gateway.sqlite | Lokasi SQLite                        |
| `UPSTREAM_CACHE_TTL_MS`       | —     | 5000                | TTL cache upstream                   |
| `CLAIMED_CLEANUP_INTERVAL_MS` | —     | 86400000            | Interval cleanup klaim               |
| `MAX_LOGS`                    | —     | 100                 | Ukuran ring buffer log               |
| `GOJEK_TRANSACTIONS_URL`      | —     | (default prod)      | Override URL upstream                |
| `NODE_ENV`                    | —     | development         | `test` → `.env.test` + DB `:memory:` |

## 14. Perintah Operasional

```bash
bun install                # instalasi
bun run login              # login OTP (sekali; tulis file sesi)
bun run dev                # development (hot reload)
bun run start              # produksi
bun test                   # unit + integration test
bun run check              # lint + format check (Biome)
bun run format             # auto-format
bun run benchmark          # benchmark internal
docker compose up -d --build
docker compose logs -f
```

**Backup:** hentikan server → salin `data/gateway.sqlite` (+ `-wal`/`-shm` bila ada) dan `.GOPAY_SESI_JANGAN_DIHAPUS.json`.
**Restore:** kembalikan kedua file ke lokasi semula → jalankan server. Migrasi skema berjalan otomatis saat start.

## 15. Known Issues & Keterbatasan Upstream

1. **CORS masih allow-all** (`cors()`) — belum dibatasi origin (SEC-04).
2. **Belum ada rate limiting** per klien (SEC-05); mitigasi upstream hanya single-flight + TTL cache.
3. **`?api_key=` masih diterima** selain header (SEC-08) — dipertahankan demi kompatibilitas; berisiko bocor di access log.
4. **`login.js` & `sessionManager.js` tetap obfuscated** (SEC-01) — black-box by design, antarmuka diuji.
5. **Ketergantungan upstream Gojek**: ketersediaan dan perubahan contract di luar kendali; sesi kedaluwarsa ditangani auto-refresh 6 jam.
6. **Serverless ephemeral tidak didukung** (butuh disk persisten untuk SQLite + file sesi).
7. Docker `version: "3.8"` pada compose sudah usang untuk Compose v2 (kosmetik).

**Diperbaiki saat penyusunan laporan ini:** deskripsi `package.json` ("Stateless" → "Bun + SQLite Persisten"), wording README ("37 suites" → "37 tests di 11 file"), mount file sesi di `docker-compose.yml`.

## 16. Migrasi Deployment & Rollback

**Migrasi (deploy baru):** clone → `bun install` → siapkan `.env` → `bun run login` → `bun run start` atau `docker compose up -d --build`. Database dibuat + dimigrasi otomatis saat start pertama.

**Migrasi (deploy existing):** `git pull` → `bun install` → restart proses. Data SQLite lama terbaca (migrasi additive, `user_version` monotonik).

**Rollback:** `git checkout <commit-sebelumnya>` → `bun install` → restart; volume `./data` dan file sesi tidak diubah. Untuk Docker: simpan image sebelumnya (`docker tag`), `docker compose down` → jalankan image lama dengan volume yang sama. Catatan: versi Node.js lama (pra-refactor) mengabaikan file SQLite — tidak ada jalur migrasi balik data transaksi.

---

## Lampiran: Scorecard Acceptance Criteria (TODO.md §19)

| #   | Kriteria                                  | Status                                                 |
| --- | ----------------------------------------- | ------------------------------------------------------ |
| 1   | Bun stable dipin                          | ✔ v1.4.3 (Dockerfile)                                  |
| 2   | Express tetap berjalan                    | ✔ 4.x                                                  |
| 3   | Endpoint lama berfungsi                   | ✔ 37 test integration                                  |
| 4   | Login OTP & session manager kompatibel    | ✔ interface test; live OTP tidak dijalankan            |
| 5   | QRIS lokal + CRC lolos test               | ✔                                                      |
| 6   | Nominal tervalidasi ketat                 | ✔                                                      |
| 7   | ID pembayaran crypto                      | ✔                                                      |
| 8   | QRIS/status/klaim persisten               | ✔ SQLite WAL                                           |
| 9   | Klaim transaksi atomik                    | ✔ transaksi + PK                                       |
| 10  | Status ambigu ≠ PAID                      | ✔                                                      |
| 11  | Polling snapshot bersama, tanpa agresif   | ✔ single-flight + TTL                                  |
| 12  | CORS, API key, secret, sesi, log ditinjau | ⚠ ditinjau; CORS/rate-limit/query-param = known issues |
| 13  | Docker persisten + non-root               | ✔ (+ mount sesi diperbaiki)                            |
| 14  | Automated test berjalan & dilaporkan      | ✔ 37 PASS / 0 FAIL                                     |
| 15  | README mencerminkan implementasi          | ✔ setelah 3 perbaikan docs                             |
| 16  | Tidak ada perubahan pengguna terhapus     | ✔ diff minimal                                         |
| 17  | Benchmark berbasis pengukuran             | ✔ BENCHMARK.md empiris                                 |

**Kesimpulan:** 15/17 terpenuhi penuh; #4 dan #12 terpenuhi dengan catatan yang terdokumentasi di §15.
