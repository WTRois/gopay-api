import { describe, expect, test } from "bun:test";

const { generateQrisId, generateTrxId } = require("../../src/utils/ids");

describe("Cryptographically Secure ID Generation", () => {
  test("generateQrisId produces 16-hex characters", () => {
    const id = generateQrisId();
    expect(typeof id).toBe("string");
    expect(id.length).toBe(16);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  test("generateTrxId produces TRX- prefix and uppercase hex string", () => {
    const trx = generateTrxId();
    expect(typeof trx).toBe("string");
    expect(trx.startsWith("TRX-")).toBe(true);
    expect(trx.length).toBe(16);
    expect(trx).toMatch(/^TRX-[0-9A-F]{12}$/);
  });

  test("generates unique IDs without collisions across iterations", () => {
    const qrisSet = new Set();
    const trxSet = new Set();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      qrisSet.add(generateQrisId());
      trxSet.add(generateTrxId());
    }

    expect(qrisSet.size).toBe(count);
    expect(trxSet.size).toBe(count);
  });
});
