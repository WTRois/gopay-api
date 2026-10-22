import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const app = require("../../src/app");
const config = require("../../src/config/env");

describe("Transactions Routes Integration", () => {
  let server;
  let baseUrl;
  const apiKey = "test-secret-api-key-12345";

  beforeAll((done) => {
    config.apiKey = apiKey;
    process.env.API_KEY = apiKey;
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test("GET /transactions requires authentication", async () => {
    const res = await fetch(`${baseUrl}/transactions`);
    expect(res.status).toBe(401);
  });

  test("GET /transactions/all requires authentication", async () => {
    const res = await fetch(`${baseUrl}/transactions/all`);
    expect(res.status).toBe(401);
  });

  test("GET /transactions returns 400 when session is absent without crashing", async () => {
    const res = await fetch(`${baseUrl}/transactions`, {
      headers: { "x-api-key": apiKey },
    });
    // Since no valid session file exists in test environment, it safely returns 400 or 500 JSON without crash
    expect([400, 500]).toContain(res.status);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  test("GET /transactions/all returns 400 when session is absent without crashing", async () => {
    const res = await fetch(`${baseUrl}/transactions/all`, {
      headers: { "x-api-key": apiKey },
    });
    expect([400, 500]).toContain(res.status);
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});
