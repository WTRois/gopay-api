# GoPay Merchant Gateway

<p align="center">
  <img src="https://img.shields.io/badge/Bun-1.4.3-black?logo=bun&logoColor=white" alt="Bun v1.4.3" />
  <img src="https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?logo=sqlite&logoColor=white" alt="SQLite WAL" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Auth-OTP%20Based-00AED9" alt="OTP Auth" />
  <img src="https://img.shields.io/badge/QRIS-EMVCo%20Local-red" alt="QRIS" />
  <img src="https://img.shields.io/badge/Linter-Biome-60A5FA?logo=biome&logoColor=white" alt="Biome" />
  <img src="https://img.shields.io/badge/Deploy-Docker%20%7C%20VPS%20%7C%20PM2-orange" alt="Deploy Options" />
</p>

<p align="center">
  <a href="https://t.me/ahmadzakiyo">
    <img src="https://img.shields.io/badge/Telegram-Chat%20Owner-2CA5E0?logo=telegram&logoColor=white&style=for-the-badge" alt="Chat Owner" />
  </a>
  &nbsp;
  <a href="https://t.me/nuxysproject">
    <img src="https://img.shields.io/badge/Telegram-Channel%20Updates-2CA5E0?logo=telegram&logoColor=white&style=for-the-badge" alt="Channel" />
  </a>
</p>

High-performance, self-hosted API Gateway berbasis **Bun v1.4.3** untuk otomatisasi verifikasi transaksi dan cetak QRIS dinamis dari akun **GoPay / GoFood Merchant** Anda.

---

> [!NOTE]
> 💬 **HUBUNGI OWNER & BERGABUNG CHANNEL:**
> - 👤 **Developer / Owner:** [@ahmadzakiyo](https://t.me/ahmadzakiyo)
> - 📢 **Channel Update & Project:** [@nuxysproject](https://t.me/nuxysproject)

> [!TIP]
> 📣 **PENGUMUMAN & UPDATE TERBARU: Migrasi ke Bun v1.4.3 & SQLite WAL**
> Gateway ini kini berjalan di atas **Bun v1.4.3** dengan database persisten bawaan (`bun:sqlite` WAL mode), rendering QR lokal tanpa dependensi API eksternal, proteksi single-flight request coalescing, dan pembaruan token otomatis di background setiap 6 jam.

> [!CAUTION]
> 🚨 **PERSYARATAN PENYIMPANAN PERSISTEN**
> Gateway ini membutuhkan penyimpanan permanen untuk file sesi (`.GOPAY_SESI_JANGAN_DIHAPUS.json`) dan database transaksi SQLite (`./data/payments.sqlite`).
> **DILARANG MENGGUNAKAN SERVERLESS EPHEMERAL** (seperti Render Free tier atau Vercel) karena container akan sleep dan menghapus file sesi & database lokal.

> [!WARNING]
> ⚠️ **DISCLAIMER:**
> Project ini **tidak berafiliasi** dengan PT GoTo Gojek Tokopedia Tbk / GoPay. Seluruh data berjalan 100% aman di server Anda sendiri tanpa dikirim ke pihak ketiga.

---

## ✨ Fitur Utama

- 🚀 **Bun v1.4.3 Native Runtime** — Performa tinggi, konsumsi memori rendah (~4.5MB RSS vs ~45MB di Node), dan startup instan.
- 🗄️ **Persistent Storage (SQLite WAL)** — Menggunakan `bun:sqlite` dengan Write-Ahead Logging dan transaksi atomic anti-double-claim (`TRX-ID` scope).
- 🛡️ **Upstream Request Deduplication** — Single-flight request coalescing dengan cache TTL 5 detik untuk mencegah spam dan rate-limit upstream GoPay.
- 🧾 **QRIS Dinamis 100% Lokal** — Generate QRIS dinamis (EMVCo TLV + CRC16) dan render PNG/DataURL secara lokal menggunakan library `qrcode` (bebas kebocoran ke API pihak ketiga).
- 🔐 **Login OTP Terminal** — Login resmi via SMS/WA (`bun run login`) menggunakan nomor HP GoBiz.
- 🔄 **Auto-Refresh Token** — Token diperbarui otomatis di background setiap 6 jam tanpa perlu login ulang.
- 📱 **Halaman Checkout Interaktif** — UI checkout modern dengan timer countdown 5 menit, manual check, dan auto-polling terkontrol.
- 🔒 **Proteksi API Key & Endpoint Public** — Proteksi API Key untuk endpoint sensitif dan endpoint status publik aman untuk frontend browser.
- 🐳 **Docker Multi-Stage Non-Root** — Image container ramping (~52 MB) berbasis `oven/bun:1.4.3-alpine` dengan user non-root `bun`.

---

## 💻 Persyaratan Sistem

- **Bun ≥ 1.4.0** (Direkomendasikan **Bun v1.4.3**) atau **Docker Engine ≥ 24.x**
- Akun GoBiz / GoFood Merchant aktif terdaftar nomor HP
- QRIS statis dari aplikasi GoBiz

---

## 🛠️ Quick Start (Pengujian Lokal)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/ahmadzakiyox/gopay-api-gateaway.git
cd gopay-api-gateaway
bun install
```

### 2. Konfigurasi `.env`

Salin template `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Sesuaikan variabel di `.env`:
```env
PORT=3000
API_KEY=YOUR_API_KEY_HERE
QRIS_STATIC=00020101021126...
GOPAY_MERCHANT_ID=YOUR_MERCHANT_ID_HERE
PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Login OTP di Terminal (1 Kali Saja)

```bash
bun run login
```

- Masukkan nomor HP GoBiz (contoh: `085119772671`).
- Masukkan kode OTP (4 digit) dari SMS/WhatsApp.
- Sesi login akan disimpan permanen di `.GOPAY_SESI_JANGAN_DIHAPUS.json`.

### 4. Jalankan Gateway

```bash
# Mode Development (Hot Reload)
bun run dev

# Mode Production
bun run start
```

---

## 🧪 Testing, Linting & Benchmark

Project ini dilengkapi dengan suite pengujian unit dan integrasi berbasis `bun:test` serta linter Biome:

```bash
# Menjalankan unit & integration test (37 suites, 126 assertions)
bun test

# Linting & Formatting Check (Biome)
bun run check

# Auto-format kode
bun run format

# Benchmark performa internal
bun run benchmark
```

Hasil benchmark menunjukkan gateway mampu melayani **> 5.000 RPS** dengan latensi p50 sebesar **0.07 ms** di Bun. Rincian lengkap tersedia di [docs/BENCHMARK.md](file:///Users/bidang4/Documents/GitHub/gopay-api/docs/BENCHMARK.md).

---

## 🐳 Panduan Deploy Docker & Docker Compose

Deploy menggunakan Docker Compose sangat direkomendasikan untuk production:

```bash
# 1. Pastikan .env dan sesi login sudah ada
cp .env.example .env
bun run login

# 2. Jalankan container di background
docker compose up -d --build

# 3. Cek log container
docker compose logs -f
```

Konfigurasi `docker-compose.yml` telah mengamankan direktori database `./data` dan file sesi melalui Docker volume mounts:

```yaml
services:
  gopay-gateway:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./.GOPAY_SESI_JANGAN_DIHAPUS.json:/app/.GOPAY_SESI_JANGAN_DIHAPUS.json
```

---

## 🚀 Panduan Deploy VPS (Systemd / PM2)

### Metode A: PM2

```bash
# Jalankan menggunakan Bun via PM2
pm2 start "bun run server.js" --name "gopay-gateway"
pm2 save
pm2 startup
```

### Metode B: Systemd Service (Linux Production Standard)

Buat service file `/etc/systemd/system/gopay-gateway.service`:
```ini
[Unit]
Description=GoPay Merchant Gateway (Bun)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/gopay-api-gateaway
ExecStart=/home/ubuntu/.bun/bin/bun run server.js
Restart=always
RestartSec=5
EnvironmentFile=/home/ubuntu/gopay-api-gateaway/.env

[Install]
WantedBy=multi-user.target
```

Aktifkan service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gopay-gateway
```

---

## 📡 API Reference

Semua endpoint privat memerlukan autentikasi melalui header atau query parameter:
```text
Header   : X-Api-Key: <API_KEY>
Query    : ?api_key=<API_KEY>
```

### 1. `GET /token-status` — Cek Status Sesi Token

```http
GET http://localhost:3000/token-status?api_key=RAHASIA
```
**Respon Sukses:**
```json
{
  "success": true,
  "data": {
    "token_status": "valid",
    "message": "Token dan Sesi GoPay Merchant Aktif"
  }
}
```

---

### 2. `GET /create-qris` (atau `POST`) — Buat QRIS Dinamis

Membuat QRIS dinamis EMVCo lokal dengan masa berlaku **5 menit**.
```http
GET http://localhost:3000/create-qris?amount=25000&api_key=RAHASIA
```
| Parameter | Tipe     | Keterangan                             |
| --------- | -------- | -------------------------------------- |
| `amount`  | `number` | Nominal transaksi dalam Rupiah (wajib) |
| `api_key` | `string` | API Key rahasia                        |

**Respon Sukses:**
```json
{
  "success": true,
  "data": {
    "qris_id": "a1b2c3d4e5f67890",
    "trx_id": "TRX-A3F8K2M91234",
    "qris_url": "http://localhost:3000/qr/a1b2c3d4e5f67890",
    "qris_code": "00020101021126...",
    "amount": 25000,
    "expires_at": "2026-10-22T12:05:00.000Z",
    "expires_in": "5 menit"
  }
}
```

---

### 3. `GET /qr/:id` — Halaman Pembayaran Checkout QRIS

Membuka tampilan web interaktif ramah pengguna untuk pelanggan:
- Timer hitung mundur 5 menit.
- Tombol cek manual instan.
- Gambar QRIS yang dirender langsung via Base64 Data URL tanpa dependensi server luar.
- Format gambar mentah PNG dapat diakses via `?format=raw` atau `?raw=1`.

---

### 4. `GET /api/qr-status/:id` — Status Check Public

Endpoint publik (bebas API key) khusus untuk polling status transaksi dari halaman checkout browser:
```http
GET http://localhost:3000/api/qr-status/a1b2c3d4e5f67890
```

---

### 5. `GET /check-payment` (atau `POST`) — Verifikasi Pembayaran Masuk

Mencari transaksi yang cocok berdasarkan nominal dan timestamp. Dilindungi transaksi SQLite atomic anti-double-claim:
```http
GET http://localhost:3000/check-payment?amount=25000&trx_id=TRX-A3F8K2M91234&api_key=RAHASIA
```
| Parameter   | Tipe     | Default     | Keterangan                                               |
| ----------- | -------- | ----------- | -------------------------------------------------------- |
| `amount`    | `number` | —           | Nominal transaksi yang dicari (wajib)                    |
| `trx_id`    | `string` | —           | TRX-ID dari `/create-qris` untuk isolasi klaim transaksi |
| `startTime` | `string` | 24 jam lalu | Timestamp ISO awal pencarian mutasi                      |
| `api_key`   | `string` | —           | API Key Anda                                             |

**Respon Sukses (Lunas):**
```json
{
  "success": true,
  "paid": true,
  "transaction": {
    "transaction_id": "gopay-tx-12345",
    "order_id": "GOPAY-1234567890",
    "amount": 25000,
    "payer_issuer": "GoPay / BCA",
    "payment_type": "QRIS",
    "transaction_time": "2026-10-22T12:01:12.000Z"
  }
}
```

---

### 6. `GET /transactions` — Riwayat Mutasi Transaksi

```http
GET http://localhost:3000/transactions?pageSize=20&api_key=RAHASIA
```

---

### 7. `GET /api/logs` & `GET /health`

- `/health` — Status kesehatan container, database SQLite, dan sesi upstream.
- `/api/logs` — In-memory ring buffer log server.

---

## 📁 Struktur Project

```
gopay-gateway/
├── src/
│   ├── app.js                         # Inisialisasi Express & Middleware
│   ├── server.js                      # Entrypoint Server & Graceful Shutdown
│   ├── healthcheck.js                 # Native Healthcheck Script Docker
│   ├── config/env.js                  # Skema & Validasi Environment
│   ├── routes/                        # Modular Router Endpoints
│   ├── services/                      # Logika Bisnis, QRIS, Upstream & Sesi
│   ├── storage/                       # bun:sqlite Engine, Migrations & Repo
│   ├── utils/                         # Logger, Crypto IDs & Sanitizer
│   └── web/                           # Template Checkout UI
├── tests/                             # Unit & Integration Test Suites
├── docs/                              # Kontrak API, Audit & Benchmark
├── data/                              # SQLite Database Storage (WAL)
├── login.js                           # Sesi OTP CLI (Black-box Wrapper)
├── sessionManager.js                  # Engine Pembaru Sesi Upstream
├── server.js                          # Backward-Compatible Entrypoint Shim
├── Dockerfile                         # Multi-stage Bun Alpine Container
├── docker-compose.yml                 # Service & Persistent Volume Spec
└── bun.lock                           # Lockfile Dependensi Bun
```

---

## 💬 Kontak & Komunitas

<p align="center">
  <a href="https://t.me/ahmadzakiyo">
    <img src="https://img.shields.io/badge/Telegram-Chat%20Owner-2CA5E0?logo=telegram&logoColor=white&style=for-the-badge" alt="Chat Owner" />
  </a>
  &nbsp;
  <a href="https://t.me/nuxysproject">
    <img src="https://img.shields.io/badge/Telegram-Channel%20Updates-2CA5E0?logo=telegram&logoColor=white&style=for-the-badge" alt="Channel" />
  </a>
</p>

- 👤 **Owner / Developer:** [@ahmadzakiyo](https://t.me/ahmadzakiyo)
- 📢 **Channel (Update & Project):** [@nuxysproject](https://t.me/nuxysproject)

---

## ☕ Dukung Project Ini

Kalau project ini bermanfaat, dukung pengembangan selanjutnya ya! ☕

<p align="center">
  <img src="https://raw.githubusercontent.com/ahmadzakiyox/DB/main/6269360055874426106_121.jpg" alt="QRIS Donasi ahmadzakiyo" width="250" />
  <br/>
  <sub>Nominal bebas — terima kasih banyak! 🙏</sub>
</p>
