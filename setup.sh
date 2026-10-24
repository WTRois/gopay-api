#!/usr/bin/env bash
# =================================================================
# GoPay Merchant Gateway - Automated Setup Script (VPS & cPanel)
# =================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "=========================================================="
echo "        GoPay Merchant Gateway - Setup Helper             "
echo "=========================================================="
echo -e "${NC}"

# 1. Cek versi Bun atau Node.js
if command -v bun &> /dev/null; then
    RUNNER="bun"
    BUN_VER=$(bun --version)
    echo -e "[INFO] Bun runtime terdeteksi: ${GREEN}v${BUN_VER}${NC}"
elif command -v node &> /dev/null; then
    RUNNER="node"
    NODE_VER=$(node -v)
    echo -e "[INFO] Node.js terdeteksi: ${YELLOW}${NODE_VER}${NC} (Disarankan menggunakan Bun v1.4.3+)"
else
    echo -e "${RED}[ERROR] Runtime belum terinstall! Harap install Bun (https://bun.sh) atau Node.js.${NC}"
    exit 1
fi

# 2. Copy .env dari template jika belum ada
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "[INFO] Membuat file .env dari .env.example..."
        cp .env.example .env
        echo -e "${GREEN}[OK] File .env berhasil dibuat.${NC}"
    else
        echo -e "${YELLOW}[WARN] File .env.example tidak ditemukan, membuat .env baru dengan kunci acak...${NC}"
        GEN_API_KEY=$(openssl rand -hex 24 2>/dev/null || date +%s | sha256sum | head -c 32)
        cat <<EOT > .env
PORT=3000
API_KEY=${GEN_API_KEY}
QRIS_STATIC=
GOPAY_MERCHANT_ID=
EOT
        echo -e "${GREEN}[OK] File .env dibuat dengan konfigurasi aman (API_KEY di-generate otomatis).${NC}"
    fi
else
    echo -e "[INFO] File .env sudah ada."
fi

# 3. Install Dependencies
if [ "$RUNNER" = "bun" ]; then
    echo -e "\n[INFO] Menginstall dependencies menggunakan Bun..."
    bun install
else
    echo -e "\n[INFO] Menginstall dependencies npm..."
    npm install
fi

echo -e "${GREEN}[OK] Dependencies berhasil diinstall.${NC}\n"

# 4. Opsi Jalankan Login OTP
echo -e "=========================================================="
read -p "Apakah Anda ingin menjalankan login OTP GoPay sekarang? (y/n): " RUN_LOGIN

if [[ "$RUN_LOGIN" =~ ^[Yy]$ ]]; then
    echo -e "\n[INFO] Menjalankan login.js via $RUNNER..."
    if [ "$RUNNER" = "bun" ]; then
        bun run login.js
    else
        node login.js
    fi
else
    echo -e "${YELLOW}[INFO] Anda dapat menjalankan login OTP kapan saja dengan perintah: $RUNNER run login.js${NC}"
fi

echo -e "\n${GREEN}=========================================================="
echo "                 SETUP SELESAI SUKSES!                    "
echo "=========================================================="
echo -e "${NC}"
echo "Petunjuk cPanel:"
echo "1. Di menu 'Setup Node.js App', set Application Startup File ke: server.js"
echo "2. Pastikan Node.js Version diset ke 18.x"
echo "3. Klik 'Restart' di menu Setup Node.js App cPanel."
echo "=========================================================="
