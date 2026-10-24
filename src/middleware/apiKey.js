const crypto = require("node:crypto");
const config = require("../config/env");

const apiKeyAuth = (req, res, next) => {
  // Reject API key in query parameters to prevent leakage in logs, history, and referrers
  if (req.query?.api_key || req.query?.apiKey) {
    return res.status(401).json({
      success: false,
      message:
        "API Key tidak boleh dikirim melalui URL query string demi keamanan. Gunakan header 'x-api-key'.",
    });
  }

  const providedKey = req.headers["x-api-key"];
  const configuredKey = config.apiKey || process.env.API_KEY;

  if (!configuredKey || !providedKey || typeof providedKey !== "string") {
    return res.status(401).json({
      success: false,
      message: "API Key tidak valid atau tidak disertakan!",
    });
  }

  // Constant-time comparison via SHA-256 hash digests to prevent timing side-channels
  const a = crypto.createHash("sha256").update(providedKey).digest();
  const b = crypto.createHash("sha256").update(configuredKey).digest();

  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({
      success: false,
      message: "API Key tidak valid atau tidak disertakan!",
    });
  }

  next();
};

module.exports = apiKeyAuth;
