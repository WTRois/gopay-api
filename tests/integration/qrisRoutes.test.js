import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const app = require("../../src/app");
const config = require("../../src/config/env");

describe("QRIS Routes Integration", () => {
  let server;
  let baseUrl;
  const apiKey = "test-secret-api-key-12345";

  beforeAll((done) => {
    config.apiKey = apiKey;
    process.env.API_KEY = apiKey;
    config.qrisStatic =
      "00020101021126320014ID.LINKAJA.WWW0110123456789051300014ID.GOJEK.WWW011012345678905204549953033605802ID5912TestMerchant6007Jakarta61051234062070703A016304ABCD";

    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test("POST /create-qris rejects invalid and decimal amounts", async () => {
    const resNegative = await fetch(`${baseUrl}/create-qris`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ amount: -500 }),
    });
    expect(resNegative.status).toBe(400);

    const resDecimal = await fetch(`${baseUrl}/create-qris`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ amount: 15000.75 }),
    });
    expect(resDecimal.status).toBe(400);
  });

  test("POST /create-qris creates valid dynamic QRIS with local QR and strong IDs", async () => {
    const res = await fetch(`${baseUrl}/create-qris`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ amount: 25000 }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.qris_id).toMatch(/^[0-9a-f]{16}$/);
    expect(json.data.trx_id).toMatch(/^TRX-[0-9A-F]{12}$/);
    expect(json.data.amount).toBe(25000);
    expect(json.data.qris_code).toContain("540525000");

    // Fetch checkout page for this QRIS and verify it uses local inline data URL
    const checkoutRes = await fetch(`${baseUrl}/qr/${json.data.qris_id}`);
    expect(checkoutRes.status).toBe(200);
    const html = await checkoutRes.text();
    expect(html).toContain("Pembayaran QRIS");
    expect(html).toContain("data:image/png;base64,");
    expect(html).not.toContain("api.qrserver.com");

    // Test raw QR PNG output
    const rawRes = await fetch(`${baseUrl}/qr/${json.data.qris_id}?format=raw`);
    expect(rawRes.status).toBe(200);
    expect(rawRes.headers.get("content-type")).toBe("image/png");
    const rawBuffer = await rawRes.arrayBuffer();
    expect(rawBuffer.byteLength).toBeGreaterThan(100);
  });

  test("GET /qr/:id returns 404 for nonexistent QRIS", async () => {
    const res = await fetch(`${baseUrl}/qr/nonexistent-id`);
    expect(res.status).toBe(404);
  });
});
