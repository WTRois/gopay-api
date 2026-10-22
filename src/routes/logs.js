const express = require("express");
const apiKeyAuth = require("../middleware/apiKey");
const { activityLogs } = require("../utils/logger");

const router = express.Router();

router.get("/api/logs", apiKeyAuth, (_req, res) => {
  res.json({ success: true, logs: activityLogs });
});

module.exports = router;
