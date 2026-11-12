const express = require("express");
const apiKeyAuth = require("../middleware/apiKey");
const config = require("../config/env");
const { getLogs } = require("../utils/logger");

const router = express.Router();

router.get("/api/logs", apiKeyAuth, (_req, res) => {
  res.json({ success: true, logs: getLogs(config.maxLogs) });
});

module.exports = router;
