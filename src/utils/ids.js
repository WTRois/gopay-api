const crypto = require("node:crypto");

/**
 * Generates a cryptographically secure QRIS ID.
 * Produces a 16-character lowercase hex string.
 */
function generateQrisId() {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * Generates a cryptographically secure Transaction Reference ID.
 * Format: TRX-<12 uppercase hex chars> (e.g., TRX-9A3F1B4E8C2D)
 */
function generateTrxId() {
  return `TRX-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

module.exports = {
  generateQrisId,
  generateTrxId,
};
