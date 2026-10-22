import { describe, expect, test } from "bun:test";

const { validateAmount, escapeHtml } = require("../../src/utils/validation");

describe("Input Validation & Sanitization", () => {
  describe("validateAmount", () => {
    test("accepts valid positive integers", () => {
      expect(validateAmount(10000).valid).toBe(true);
      expect(validateAmount("25000").valid).toBe(true);
      expect(validateAmount(25000).value).toBe(25000);
    });

    test("rejects decimals and floats", () => {
      expect(validateAmount(15000.5).valid).toBe(false);
      expect(validateAmount("15000.50").valid).toBe(false);
    });

    test("rejects non-numeric inputs and NaN", () => {
      expect(validateAmount("abc").valid).toBe(false);
      expect(validateAmount(Number.NaN).valid).toBe(false);
      expect(validateAmount(Infinity).valid).toBe(false);
      expect(validateAmount("").valid).toBe(false);
      expect(validateAmount(null).valid).toBe(false);
    });

    test("rejects zero and negative amounts", () => {
      expect(validateAmount(0).valid).toBe(false);
      expect(validateAmount(-5000).valid).toBe(false);
    });

    test("enforces minimum and maximum limits", () => {
      expect(validateAmount(500, 1000, 1000000).valid).toBe(false);
      expect(validateAmount(2000000, 1000, 1000000).valid).toBe(false);
      expect(validateAmount(50000, 1000, 1000000).valid).toBe(true);
    });
  });

  describe("escapeHtml", () => {
    test("escapes dangerous HTML characters", () => {
      const malicious = "<script>alert(\"XSS & attack\")</script>'test'";
      const safe = escapeHtml(malicious);
      expect(safe).not.toContain("<script>");
      expect(safe).toContain("&lt;script&gt;");
      expect(safe).toContain("&amp;");
      expect(safe).toContain("&quot;");
      expect(safe).toContain("&#39;");
    });

    test("handles non-string inputs safely", () => {
      expect(escapeHtml(12345)).toBe("12345");
      expect(escapeHtml(null)).toBe("");
    });
  });
});
