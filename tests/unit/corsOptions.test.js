import { describe, expect, test } from "bun:test";

const { buildCorsOptions } = require("../../src/middleware/corsOptions");

function resolveOrigin(options, origin) {
  return new Promise((resolve, reject) => {
    options.origin(origin, (err, allowed) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(allowed);
    });
  });
}

describe("CORS origin policy", () => {
  test("allows a configured origin", async () => {
    const options = buildCorsOptions(["https://allowed.example"]);
    await expect(resolveOrigin(options, "https://allowed.example")).resolves.toBe(true);
  });

  test("rejects an unknown origin", async () => {
    const options = buildCorsOptions(["https://allowed.example"]);
    await expect(resolveOrigin(options, "https://evil.example")).resolves.toBe(false);
  });

  test("always allows requests without an Origin header", async () => {
    const options = buildCorsOptions(["https://allowed.example"]);
    await expect(resolveOrigin(options, undefined)).resolves.toBe(true);
  });

  test("allows every origin in wildcard mode", async () => {
    const options = buildCorsOptions(["*"]);
    await expect(resolveOrigin(options, "https://anywhere.example")).resolves.toBe(true);
  });
});
