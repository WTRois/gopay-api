const QRCode = require("qrcode");
const { renderCheckoutHtml } = require("../web/checkout");

function calculateCRC16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function generateDynamicQRIS(staticTemplate, amount) {
  if (!staticTemplate || typeof staticTemplate !== "string") return null;
  let payload = staticTemplate.trim();

  // Basic EMVCo sanity check: must start with Tag 00 Length 02 Value 01
  if (!payload.startsWith("000201")) {
    return null;
  }

  // Hapus Tag 63 (CRC) lama jika ada di akhir
  const idx63 = payload.indexOf("6304");
  if (idx63 !== -1) {
    payload = payload.substring(0, idx63);
  }

  // Parse EMVCo TLV Tags
  const tags = [];
  let i = 0;
  try {
    while (i < payload.length) {
      if (i + 4 > payload.length) break;
      const tag = payload.substring(i, i + 2);
      const length = parseInt(payload.substring(i + 2, i + 4), 10);
      if (Number.isNaN(length) || length < 0) {
        break;
      }
      const val = payload.substring(i + 4, i + 4 + length);
      tags.push({ tag, val });
      i += 4 + length;
    }
  } catch (_e) {
    return null;
  }

  if (tags.length === 0) {
    return null;
  }

  const parsedAmount = parseInt(amount, 10);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return null;
  }
  const amountStr = parsedAmount.toString();

  const newTags = [];
  let hasTag54 = false;

  for (const item of tags) {
    if (item.tag === "01") {
      // Ubah Static (11) ke Dynamic (12)
      newTags.push({ tag: "01", val: "12" });
    } else if (item.tag === "54") {
      newTags.push({ tag: "54", val: amountStr });
      hasTag54 = true;
    } else if (item.tag === "58" && !hasTag54) {
      newTags.push({ tag: "54", val: amountStr });
      hasTag54 = true;
      newTags.push(item);
    } else {
      newTags.push(item);
    }
  }

  if (!hasTag54) {
    newTags.push({ tag: "54", val: amountStr });
  }

  let result = "";
  for (const item of newTags) {
    const lenStr = item.val.length.toString().padStart(2, "0");
    result += `${item.tag}${lenStr}${item.val}`;
  }

  result += "6304";
  const checksum = calculateCRC16(result);
  return result + checksum;
}

/**
 * Generates an inline Base64 Data URL for the QR image.
 * Eliminates all dependencies on third-party QR generation APIs.
 */
async function generateQrDataUrl(payload, options = {}) {
  return await QRCode.toDataURL(payload, {
    width: options.width || 260,
    margin: options.margin || 1,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

/**
 * Generates a PNG Buffer for binary raw QR endpoints.
 */
async function generateQrPngBuffer(payload, options = {}) {
  return await QRCode.toBuffer(payload, {
    type: "png",
    width: options.width || 300,
    margin: options.margin || 1,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

module.exports = {
  calculateCRC16,
  generateDynamicQRIS,
  generateQrDataUrl,
  generateQrPngBuffer,
  renderCheckoutHtml,
};
