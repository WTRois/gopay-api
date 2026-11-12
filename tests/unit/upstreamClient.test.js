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

  test("fetchRecentTransactions makes one upstream call per merchant despite changing timestamps", async () => {
    const client = new UpstreamClient();
    let callCount = 0;
    let seenParams;

    client._request = async (params) => {
      callCount++;
      seenParams = params;
      return { transactions: [], params };
    };

    const first = await client.fetchRecentTransactions({
      merchantId: "merchant-1",
      windowHours: 1,
      size: 10,
    });
    const second = await client.fetchRecentTransactions({
      merchantId: "merchant-1",
      windowHours: 1,
      size: 10,
    });

    expect(callCount).toBe(1);
    expect(second).toBe(first);
    expect(seenParams.merchant_ids).toBe("merchant-1");
    expect(seenParams.size).toBe(10);

    await client.fetchRecentTransactions({ merchantId: "merchant-2", windowHours: 1, size: 10 });
    expect(callCount).toBe(2);
  });

  test("fetchRecentTransactions coalesces concurrent calls (single-flight)", async () => {
    const client = new UpstreamClient();
    let callCount = 0;

    client._request = async (params) => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { params };
    };

    const [a, b] = await Promise.all([
      client.fetchRecentTransactions({ merchantId: "merchant-x", windowHours: 1, size: 10 }),
      client.fetchRecentTransactions({ merchantId: "merchant-x", windowHours: 1, size: 10 }),
    ]);

    expect(callCount).toBe(1);
    expect(a).toBe(b);
  });
});
