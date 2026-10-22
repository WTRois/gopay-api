const config = require("../config/env");

const apiKeyAuth = (req, res, next) => {
  const providedKey = req.headers["x-api-key"] || req.query.api_key;
  const configuredKey = config.apiKey || process.env.API_KEY;

  if (!configuredKey || providedKey !== configuredKey) {
    return res.status(401).json({
      success: false,
      message: "API Key tidak valid atau tidak disertakan!",
    });
  }
  next();
};

module.exports = apiKeyAuth;
