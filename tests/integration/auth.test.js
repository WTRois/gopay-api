import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const { app } = require("../../server");

describe("Authentication & API Key Verification", () => {
  let server;
  let baseUrl;
  const validApiKey = "test-secret-api-key-12345";

  beforeAll((done) => {
    process.env.API_KEY = validApiKey;
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test("rejects request to /api/logs without API Key", async () => {
    const res = await fetch(`${baseUrl}/api/logs`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.status || body.success).toBeFalsy();
    expect(body.message).toContain("API Key tidak valid");
  });

  test("rejects request with invalid API Key", async () => {
    const res = await fetch(`${baseUrl}/api/logs`, {
      headers: { "x-api-key": "wrong-key" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toContain("API Key tidak valid");
  });

  test("accepts request with valid API Key in header", async () => {
    const res = await fetch(`${baseUrl}/api/logs`, {
      headers: { "x-api-key": validApiKey },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.logs)).toBe(true);
  });

  test("accepts request with valid API Key in query parameter", async () => {
    const res = await fetch(`${baseUrl}/api/logs?api_key=${validApiKey}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.logs)).toBe(true);
  });
});
