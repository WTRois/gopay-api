const express = require("express");
const apiKeyAuth = require("../middleware/apiKey");
const { logActivity } = require("../utils/logger");
const { qrisStore, verifyPayment } = require("../services/paymentService");
const { validateAmount } = require("../utils/validation");

const router = express.Router();

// Polling status QRIS oleh checkout frontend
router.get("/api/qr-status/:id", async (req, res) => {
  const qrisId = req.params.id;
  const qris = qrisStore.get(qrisId);
  if (!qris) {
    return res.json({ success: false, status: "NOT_FOUND", message: "QRIS tidak ditemukan" });
  }

  if (qris.status === "PAID") {
    return res.json({ success: true, paid: true, status: "PAID", transaction: qris.transaction });
  }

  // Cek pembayaran ke upstream terlebih dahulu sebelum menandai kedaluwarsa
  try {
    const matched = await verifyPayment(
      qris.amount,
      qris.createdAt,
      null,
      req.headers["user-agent"],
      qrisId,
    );
    if (matched) {
      qris.status = "PAID";
      qris.transaction = matched;
      qrisStore.set(qrisId, qris);
      logActivity(
        "SUCCESS",
        `Pembayaran QRIS ID ${qrisId} terverifikasi lunas untuk nominal Rp ${qris.amount}`,
      );
      return res.json({ success: true, paid: true, status: "PAID", transaction: matched });
    }
  } catch (_err) {
    // Lanjut ke pemeriksaan expiry jika verifyPayment gagal
  }

  if (Date.now() > qris.expiresAt.getTime()) {
    qrisStore.delete(qrisId);
    return res.json({
      success: false,
      paid: false,
      status: "EXPIRED",
      message: "QRIS sudah kedaluwarsa",
    });
  }

  return res.json({
    success: true,
    paid: false,
    status: "PENDING",
    message: "Belum ada pembayaran masuk",
  });
});

// Cek Pembayaran Masuk (Backend / Server-to-Server)
router.all("/check-payment", apiKeyAuth, async (req, res) => {
  const rawAmount = req.body?.amount || req.query?.amount;
  const startTime = req.body?.startTime || req.query?.startTime || req.query?.start_time;
  const scopeId = req.body?.trx_id || req.query?.trx_id || null;

  const validation = validateAmount(rawAmount);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: "Nominal pembayaran tidak valid" });
  }
  const amount = validation.value;

  try {
    const merchantId = req.headers["x-gopay-merchant-id"] || null;
    const matchedTransaction = await verifyPayment(
      amount,
      startTime,
      merchantId,
      req.headers["user-agent"],
      scopeId,
    );

    if (matchedTransaction) {
      logActivity(
        "SUCCESS",
        `Pembayaran terverifikasi lunas untuk nominal Rp ${parseInt(amount, 10)}`,
        matchedTransaction,
      );
      return res.json({
        success: true,
        paid: true,
        transaction: matchedTransaction,
      });
    }
    return res.json({
      success: true,
      paid: false,
      message: "Pembayaran belum ditemukan atau sudah pernah diklaim",
    });
  } catch (err) {
    const errorDetail = err.response
      ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
      : err.message;
    logActivity("ERROR", `Gagal periksa pembayaran: ${errorDetail}`);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data transaksi dari API GoPay",
      error: errorDetail,
    });
  }
});

module.exports = router;
