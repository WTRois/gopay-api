import { describe, expect, test } from "bun:test";

const sessionManager = require("../../sessionManager");

describe("sessionManager Black-Box Interface", () => {
  test("exports required interface methods", () => {
    expect(sessionManager).toBeDefined();
    expect(typeof sessionManager.loadSession).toBe("function");
    expect(typeof sessionManager.saveSession).toBe("function");
    expect(typeof sessionManager.isExpired).toBe("function");
    expect(typeof sessionManager.refreshSession).toBe("function");
    expect(typeof sessionManager.getValidHeaders).toBe("function");
    expect(typeof sessionManager.SESSION_FILE).toBe("string");
  });

  test("isExpired handles dummy non-expired and expired sessions", () => {
    const validSession = {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_at: Date.now() + 3600000,
    };
    const expiredSession = {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_at: Date.now() - 3600000,
    };

    expect(sessionManager.isExpired(validSession)).toBe(false);
    expect(sessionManager.isExpired(expiredSession)).toBe(true);
    expect(sessionManager.isExpired(null)).toBe(true);
  });
});
