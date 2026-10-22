const { logActivity } = require("../utils/logger");

function errorHandler(err, req, res, _next) {
  const statusCode = err.status || err.statusCode || 500;
  const message =
    statusCode >= 500
      ? "Terjadi kesalahan internal pada server"
      : err.message || "Permintaan tidak dapat diproses";

  logActivity("ERROR", `Unhandled Error [${req.method} ${req.originalUrl}]: ${err.message}`, {
    stack: err.stack,
    status: statusCode,
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" ? { error: err.message } : {}),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Rute ${req.method} ${req.originalUrl} tidak ditemukan`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
