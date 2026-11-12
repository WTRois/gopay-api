import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import express from "express";

const app = require("../../src/app");
const config = require("../../src/config/env");
const { createRateLimiter } = require("../../src/middleware/rateLimit");

describe("Rate limiting", () => {
  // Isolated app: shared limiters on the real app are per-key singletons and
  // would leak state across test files, so behaviour is exercised here.
  const max = 3;
  let server;
  let baseUrl;
  let appServer;
  let appBaseUrl;

  beforeAll((done) => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max,
      keyGenerator: (req) => req.headers["x-client-key"],
    });

    const testApp = express();
    testApp.get("/ping", limiter, (_req, res) => res.json({ success: true }));

    server = testApp.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      appServer = app.listen(0, () => {
        appBaseUrl = `http://127.0.0.1:${appServer.address().port}`;
        done();
      });
    });
  });

  afterAll((done) => {
    server.close(() => appServer.close(done));
  });

  const ping = (headers = {}) => fetch(`${baseUrl}/ping`, { headers });

  test("allows up to the limit, then rejects with 429 and Retry-After", async () => {
    const headers = { "x-client-key": "client-a" };

    for (let i = 0; i < max; i += 1) {
      const res = await ping(headers);
      expect(res.status).toBe(200);
      expect(res.headers.get("x-ratelimit-limit")).toBe(String(max));
      expect(res.headers.get("x-ratelimit-remaining")).toBe(String(max - i - 1));
    }

    const blocked = await ping(headers);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(blocked.headers.get("x-ratelimit-remaining")).toBe("0");

    const body = await blocked.json();
    expect(body.success).toBe(false);
    expect(typeof body.message).toBe("string");
  });

  test("tracks separate budgets per key", async () => {
    const res = await ping({ "x-client-key": "client-b" });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-ratelimit-remaining")).toBe(String(max - 1));
  });

  test("passes through requests without a key", async () => {
    for (let i = 0; i < max + 2; i += 1) {
      const res = await ping();
      expect(res.status).toBe(200);
      expect(res.headers.get("x-ratelimit-limit")).toBeNull();
    }
  });

  test("status polling endpoint is wired to the configured limiter", async () => {
    const qrisId = `ratelimit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const res = await fetch(`${appBaseUrl}/api/qr-status/${qrisId}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-ratelimit-limit")).toBe(String(config.rateLimitMax));
  });
});
