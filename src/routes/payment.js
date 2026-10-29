const express = require("express");
const apiKeyAuth = require("../middleware/apiKey");
const { logActivity } = require("../utils/logger");
const { qrisStore, verifyPayment } = require("../services/paymentService");
const { validateAmount } = require("../utils/validation");

const router = express.Router();

function extractMerchantInfo(qrisPayload) {
  if (!qrisPayload || typeof qrisPayload !== "string") {
    return { name: "", city: "" };
  }
  let name = "";
  let city = "";
  let i = 0;
  while (i < qrisPayload.length) {
    if (i + 4 > qrisPayload.length) break;
    const tag = qrisPayload.substring(i, i + 2);
    const length = parseInt(qrisPayload.substring(i + 2, i + 4), 10);
    if (Number.isNaN(length) || length < 0 || i + 4 + length > qrisPayload.length) break;
    const val = qrisPayload.substring(i + 4, i + 4 + length);
    if (tag === "59") name = val;
    if (tag === "60") city = val;
    i += 4 + length;
  }
  return { name, city };
}

// Polling status QRIS oleh checkout frontend
router.get("/api/qr-status/:id", async (req, res) => {
  const qrisId = req.params.id;
  const qris = qrisStore.get(qrisId);
  if (!qris) {
    return res.json({ success: false, status: "NOT_FOUND", message: "QRIS tidak ditemukan" });
  }

  const merchantInfo = extractMerchantInfo(qris.data);

  if (qris.status === "PAID") {
    return res.json({
      success: true,
      paid: true,
      status: "PAID",
      amount: qris.amount,
      merchant_name: merchantInfo.name || "GoPay Merchant",
      merchant_city: merchantInfo.city || "",
      transaction: qris.transaction,
    });
  }

  // Cek kedaluwarsa terlebih dahulu untuk mencegah klaim transaksi pada QRIS kedaluwarsa
  if (Date.now() > qris.expiresAt.getTime() || qris.status === "EXPIRED") {
    qrisStore.delete(qrisId);
    return res.json({
      success: false,
      paid: false,
      status: "EXPIRED",
      message: "QRIS sudah kedaluwarsa",
    });
  }

  // Cek pembayaran ke upstream hanya untuk QRIS aktif berstatus PENDING
  if (qris.status === "PENDING") {
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
        return res.json({
          success: true,
          paid: true,
          status: "PAID",
          amount: qris.amount,
          merchant_name: merchantInfo.name || "GoPay Merchant",
          merchant_city: merchantInfo.city || "",
          transaction: matched,
        });
      }
    } catch (_err) {
      // Lanjut jika verifikasi sementara gagal
    }
  }

  return res.json({
    success: true,
    paid: false,
    status: "PENDING",
    amount: qris.amount,
    merchant_name: merchantInfo.name || "GoPay Merchant",
    merchant_city: merchantInfo.city || "",
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
