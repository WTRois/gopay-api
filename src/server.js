const app = require("./app");
const config = require("./config/env");
const { logActivity, activityLogs } = require("./utils/logger");
const sessionService = require("./services/sessionService");
const {
  claimedTransactions,
  qrisStore,
  cleanExpiredTransactions,
  verifyPayment,
} = require("./services/paymentService");
const { generateDynamicQRIS, calculateCRC16 } = require("./services/qrisService");

// Background Jobs
let cleanupTimer = null;
let refreshTimer = null;

if (config.env !== "test") {
  cleanupTimer = setInterval(cleanExpiredTransactions, 60 * 60 * 1000); // 1 jam
  refreshTimer = setInterval(() => sessionService.autoRefreshIfExpired(), 6 * 60 * 60 * 1000); // 6 jam
}

let server = null;
if (config.env !== "test" || !import.meta.main) {
  server = app.listen(config.port, () => {
    logActivity("SYSTEM", `GoPay Partner Gateway berjalan pada port ${config.port}`);
  });
}

const gracefulShutdown = (signal) => {
  logActivity("SYSTEM", `Menerima sinyal ${signal}, memulai proses shutdown anggun...`);
  if (cleanupTimer) clearInterval(cleanupTimer);
  if (refreshTimer) clearInterval(refreshTimer);

  const { closeDatabase } = require("./storage/database");
  closeDatabase();

  if (server) {
    server.close(() => {
      logActivity("SYSTEM", "HTTP server berhasil ditutup.");
      process.exit(0);
    });
    setTimeout(() => {
      logActivity("ERROR", "Shutdown timeout, memaksa keluar.");
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

if (!import.meta.main) {
  module.exports = {
    app,
    server,
    logActivity,
    claimedTransactions,
    qrisStore,
    activityLogs,
    generateDynamicQRIS,
    calculateCRC16,
    verifyPayment,
  };
}
