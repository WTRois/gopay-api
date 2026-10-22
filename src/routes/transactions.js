const express = require("express");
const apiKeyAuth = require("../middleware/apiKey");
const { fetchFormattedTransactions } = require("../services/transactionService");

const router = express.Router();

router.get("/transactions", apiKeyAuth, async (req, res, next) => {
  try {
    const result = await fetchFormattedTransactions({
      startTime: req.query.startTime,
      endTime: req.query.endTime,
      pageSize: req.query.pageSize || 20,
      merchantId: req.headers["x-gopay-merchant-id"],
      userAgent: req.headers["user-agent"],
    });

    res.json({
      success: true,
      total_amount: result.total_amount,
      data: { transactions: result.transactions },
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/transactions/all", apiKeyAuth, async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonthUnix = Math.floor(
      new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000,
    );

    const result = await fetchFormattedTransactions({
      startTime: req.query.startTime || startOfMonthUnix,
      endTime: req.query.endTime,
      pageSize: req.query.pageSize || 100,
      merchantId: req.headers["x-gopay-merchant-id"],
      userAgent: req.headers["user-agent"],
    });

    res.json({
      success: true,
      total_amount: result.total_amount,
      data: { transactions: result.transactions },
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
