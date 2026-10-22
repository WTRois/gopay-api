/**
 * Validates payment nominal amount according to Bank Indonesia / QRIS standards.
 * - Must be a valid positive integer > 0
 * - Rejects decimals, NaN, Infinity, and values exceeding standard QRIS limits
 */
function validateAmount(rawAmount, min = 1, max = 10000000) {
  if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
    return { valid: false, error: "Nominal pembayaran wajib diisi" };
  }

  const str = String(rawAmount).trim();

  // Strict integer pattern: digits only
  if (!/^\d+$/.test(str)) {
    return {
      valid: false,
      error: "Nominal pembayaran harus berupa bilangan bulat positif tanpa desimal",
    };
  }

  const num = Number(str);

  if (!Number.isSafeInteger(num) || num <= 0) {
    return { valid: false, error: "Nominal pembayaran harus berupa angka positif lebih dari 0" };
  }

  if (num < min) {
    return {
      valid: false,
      error: `Nominal pembayaran minimal adalah Rp ${new Intl.NumberFormat("id-ID").format(min)}`,
    };
  }

  if (num > max) {
    return {
      valid: false,
      error: `Nominal pembayaran maksimal adalah Rp ${new Intl.NumberFormat("id-ID").format(max)}`,
    };
  }

  return { valid: true, value: num };
}

/**
 * Escapes HTML characters to prevent XSS in server-rendered templates.
 */
function escapeHtml(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = {
  validateAmount,
  escapeHtml,
};
