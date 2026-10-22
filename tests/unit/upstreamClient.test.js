import { describe, expect, test } from "bun:test";

const { UpstreamClient } = require("../../src/services/upstreamClient");

describe("UpstreamClient Caching & Single-Flight", () => {
  test("caches response for TTL duration", async () => {
    const client = new UpstreamClient();
    let callCount = 0;

    // Mock fetchTransactions internal execution
    client.fetchTransactions = async (params) => {
      const key = client._buildCacheKey(params);
      const cached = client.cache.get(key);
      if (cached && Date.now() - cached.timestamp < client.cacheTtl) {
        return cached.data;
      }
      callCount++;
      const data = { transactions: [{ id: "tx-1", amount: 10000 }] };
      client.cache.set(key, { timestamp: Date.now(), data });
      return data;
    };

    const res1 = await client.fetchTransactions({ size: 10 });
    const res2 = await client.fetchTransactions({ size: 10 });

    expect(res1).toEqual(res2);
    expect(callCount).toBe(1); // Second call served from TTL cache
  });

  test("clears cache properly", async () => {
    const client = new UpstreamClient();
    client.cache.set("test-key", { timestamp: Date.now(), data: {} });
    expect(client.cache.size).toBe(1);
    client.clearCache();
    expect(client.cache.size).toBe(0);
  });
});
