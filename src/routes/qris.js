const express = require("express");
const apiKeyAuth = require("../middleware/apiKey");
const config = require("../config/env");
const { logActivity } = require("../utils/logger");
const { generateQrisId, generateTrxId } = require("../utils/ids");
const { validateAmount } = require("../utils/validation");
const { qrisStore } = require("../services/paymentService");
const {
  generateDynamicQRIS,
  generateQrDataUrl,
  generateQrPngBuffer,
  renderCheckoutHtml,
} = require("../services/qrisService");

const router = express.Router();

// Buat QRIS Dinamis (Support GET query & POST body)
router.all("/create-qris", apiKeyAuth, (req, res) => {
  const rawAmount = req.body?.amount || req.query?.amount;
  const validation = validateAmount(rawAmount, config.minAmount, config.maxAmount);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.error || "Nominal pembayaran tidak valid (gunakan ?amount=...)",
    });
  }

  const amount = validation.value;
  const staticTemplate = config.qrisStatic || process.env.QRIS_STATIC;
  if (!staticTemplate) {
    return res
      .status(500)
      .json({ success: false, message: "QRIS_STATIC belum dikonfigurasi di .env" });
  }

  const dynamicCode = generateDynamicQRIS(staticTemplate, amount);
  if (!dynamicCode) {
    return res.status(500).json({
      success: false,
      message: "Gagal membuat kode QRIS dinamis dari template statis",
    });
  }

  // Strong cryptographically secure IDs
  const qrisId = generateQrisId();
  const trxId = generateTrxId();
  const expiresAt = new Date(Date.now() + config.qrisExpiryMs);
  const createdAt = new Date();

  qrisStore.set(qrisId, {
    data: dynamicCode,
    amount,
    trxId,
    expiresAt,
    createdAt,
    status: "PENDING",
  });

  const baseUrl =
    config.publicBaseUrl || `${req.protocol}://${req.get("host") || "localhost:3000"}`;
  const publicUrl = `${baseUrl}/qr/${qrisId}`;

  logActivity("INFO", `QRIS Dinamis dibuat | TRX-ID: ${trxId} | Nominal: Rp ${amount}`);

  res.json({
    success: true,
    data: {
      qris_id: qrisId,
      trx_id: trxId,
      qris_url: publicUrl,
      qris_code: dynamicCode,
      amount,
      expires_at: expiresAt.toISOString(),
      expires_in: "5 menit",
    },
  });
});

// Render Halaman HTML QRIS Interaktif (Tombol Cek Manual + Auto Polling Toggle)
router.get("/qr/:id", async (req, res) => {
  const qris = qrisStore.get(req.params.id);
  if (!qris) {
    return res.status(404).send("<h3>Gambar QRIS tidak ditemukan atau telah dihapus</h3>");
  }

  // Jika dipanggil via query format=raw / raw=1, kirim gambar mentah PNG langsung (tanpa 3rd party API)
  if (req.query.format === "raw" || req.query.raw === "1") {
    if (Date.now() > qris.expiresAt.getTime()) {
      qrisStore.delete(req.params.id);
      return res.status(410).send("QRIS Kedaluwarsa");
    }
    try {
      const qrBuffer = await generateQrPngBuffer(qris.data, { width: 300 });
      res.setHeader("Content-Type", "image/png");
      return res.send(qrBuffer);
    } catch (err) {
      logActivity("ERROR", `Gagal generate QR buffer: ${err.message}`);
      return res.status(500).send("Gagal membuat gambar QR");
    }
  }

  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(qris.amount);

  let qrImageUrl;
  try {
    qrImageUrl = await generateQrDataUrl(qris.data, { width: 260 });
  } catch (err) {
    logActivity("ERROR", `Gagal generate inline QR Data URL: ${err.message}`);
    return res.status(500).send("Gagal membuat gambar QRIS lokal");
  }

  const expiresTimestamp = qris.expiresAt.getTime();

  const html = renderCheckoutHtml({
    qrisId: req.params.id,
    formattedAmount,
    qrImageUrl,
    expiresTimestamp,
    initialStatus: qris.status,
    initialTransaction: qris.transaction,
  });

  res.send(html);
});

module.exports = router;
