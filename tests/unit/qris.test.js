import { describe, expect, test } from "bun:test";

const {
  generateDynamicQRIS,
  calculateCRC16,
  generateQrDataUrl,
  generateQrPngBuffer,
} = require("../../src/services/qrisService");

describe("QRIS Utilities & CRC16", () => {
  const dummyStaticQRIS =
    "00020101021126320014ID.LINKAJA.WWW0110123456789051300014ID.GOJEK.WWW011012345678905204549953033605802ID5912TestMerchant6007Jakarta61051234062070703A016304ABCD";

  test("calculateCRC16 computes 4-character hex uppercase checksum", () => {
    const checksum = calculateCRC16("0002010102126304");
    expect(checksum).toBeDefined();
    expect(checksum.length).toBe(4);
    expect(checksum).toMatch(/^[0-9A-F]{4}$/);
  });

  test("generateDynamicQRIS transforms static tag 01 from 11 to 12 and injects tag 54 with amount", () => {
    const dynamic = generateDynamicQRIS(dummyStaticQRIS, 15000);
    expect(dynamic).toBeDefined();
    expect(typeof dynamic).toBe("string");
    // Should have Tag 01 with '12' (dynamic)
    expect(dynamic).toContain("010212");
    // Should have Tag 54 with amount 15000 (length 5)
    expect(dynamic).toContain("540515000");
    // Must end with Tag 63 (CRC)
    expect(dynamic).toContain("6304");
  });

  test("generateDynamicQRIS returns null on empty or null input", () => {
    expect(generateDynamicQRIS(null, 10000)).toBeNull();
    expect(generateDynamicQRIS("", 10000)).toBeNull();
    expect(generateDynamicQRIS("INVALID_PAYLOAD", 10000)).toBeNull();
  });

  test("generateQrDataUrl generates valid inline base64 image data URL", async () => {
    const dataUrl = await generateQrDataUrl(dummyStaticQRIS);
    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  test("generateQrPngBuffer generates valid PNG binary buffer", async () => {
    const buffer = await generateQrPngBuffer(dummyStaticQRIS);
    expect(buffer).toBeDefined();
    expect(Buffer.isBuffer(buffer)).toBe(true);
    // PNG magic signature: 0x89 0x50 0x4E 0x47
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
  });
});
