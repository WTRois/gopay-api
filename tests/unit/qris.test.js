import { describe, expect, test } from "bun:test";

const { generateDynamicQRIS, calculateCRC16 } = require("../../server");

describe("QRIS Utilities & CRC16", () => {
  const dummyStaticQRIS =
    "00020101021126590014ID.LINKAJA.WWW011893600911002224508902081234567851440014ID.GOJEK.WWW01189360000000000000000208123456785204549953033605802ID5912TestMerchant6007Jakarta61051234062070703A016304ABCD";

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
  });
});
