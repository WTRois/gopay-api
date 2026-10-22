const path = require("node:path");
require("dotenv").config({
  path: process.env.NODE_ENV === "test" ? path.resolve(process.cwd(), ".env.test") : undefined,
});

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  apiKey: process.env.API_KEY || "",
  qrisStatic: process.env.QRIS_STATIC || "",
  gopayMerchantId: process.env.GOPAY_MERCHANT_ID || "",
  qrisExpiryMs: parseInt(process.env.QRIS_EXPIRY_MS || "300000", 10), // 5 menit
  maxLogs: parseInt(process.env.MAX_LOGS || "100", 10),
  claimedCleanupIntervalMs: parseInt(process.env.CLAIMED_CLEANUP_INTERVAL_MS || "86400000", 10), // 24 jam
  gojekTransactionsUrl:
    process.env.GOJEK_TRANSACTIONS_URL ||
    "https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions",
  cacheFile: path.resolve(process.cwd(), ".gopay_cache.json"),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
  minAmount: parseInt(process.env.MIN_AMOUNT || "1", 10),
  maxAmount: parseInt(process.env.MAX_AMOUNT || "10000000", 10),
  dbPath:
    process.env.DB_PATH ||
    (process.env.NODE_ENV === "test"
      ? ":memory:"
      : path.resolve(process.cwd(), "data/gateway.sqlite")),
  upstreamCacheTtlMs: parseInt(process.env.UPSTREAM_CACHE_TTL_MS || "5000", 10),
};

module.exports = config;
