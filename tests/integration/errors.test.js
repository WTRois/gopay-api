import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const app = require("../../src/app");

describe("Error Handling & Security", () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test("returns client-safe error without leaking stack trace on unknown routes", async () => {
    const res = await fetch(`${baseUrl}/api/unknown-route-12345`);
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).not.toContain("node_modules");
    expect(text).not.toContain("at Function.");
  });
});
