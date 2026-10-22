import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const { app } = require("../../server");

describe("Health Endpoints", () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    process.env.PORT = "0";
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test("GET / should return plain text running status", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("GoPay Partner API Gateway Berjalan");
  });

  test("GET /health should return valid health JSON structure", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("OK");
    expect(data.service).toBe("GoPay Partner API Gateway");
    expect(typeof data.timestamp).toBe("string");
  });

  test("GET /api/health should mirror /health response", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe("Layanan API GoPay Berfungsi Normal");
    expect(typeof data.timestamp).toBe("string");
  });
});
