const express = require("express");
const apiKeyAuth = require("../middleware/apiKey");
const sessionService = require("../services/sessionService");
const config = require("../config/env");

const router = express.Router();

router.get("/", (_req, res) => {
  res.send("GoPay Partner API Gateway Berjalan");
});

router.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    service: "GoPay Partner API Gateway",
    timestamp: new Date().toISOString(),
  });
});

router.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Layanan API GoPay Berfungsi Normal",
    timestamp: new Date().toISOString(),
  });
});

router.get("/token-status", apiKeyAuth, async (req, res) => {
  try {
    const activeHeaders = await sessionService.getValidHeaders(req.headers["user-agent"]);
    if (!activeHeaders) {
      return res.status(401).json({
        success: false,
        message: "Sesi GoPay belum ada atau kedaluwarsa. Jalankan `node login.js` di terminal.",
      });
    }
    res.json({
      success: true,
      message: "Sesi GoPay AKTIF dan SIAP DIGUNAKAN",
      merchant_id: config.gopayMerchantId || "Auto Detect via Session",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
