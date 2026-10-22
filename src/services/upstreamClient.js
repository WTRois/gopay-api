const axios = require("axios");
const config = require("../config/env");
const { logActivity } = require("../utils/logger");
const sessionService = require("./sessionService");

class UpstreamClient {
  constructor() {
    this.cache = new Map(); // key -> { timestamp, data }
    this.inFlightRequests = new Map(); // key -> Promise
    this.requestsCount = 0;
  }

  get cacheTtl() {
    return config.upstreamCacheTtlMs || 5000;
  }

  _buildCacheKey(params) {
    return JSON.stringify(params);
  }

  /**
   * Fetches transactions from Gojek upstream API with single-flight deduplication and short TTL caching.
   */
  async fetchTransactions(params, userAgent = null) {
    const cacheKey = this._buildCacheKey(params);
    const now = Date.now();

    // 1. Check TTL cache
    const cached = this.cache.get(cacheKey);
    if (cached && now - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }

    // 2. Single-flight coalescing: return existing in-flight promise if active
    if (this.inFlightRequests.has(cacheKey)) {
      return await this.inFlightRequests.get(cacheKey);
    }

    // 3. Initiate new upstream request
    const requestPromise = (async () => {
      try {
        const headers = await sessionService.getValidHeaders(userAgent);
        if (!headers) {
          const error = new Error("Sesi GoPay belum ada. Jalankan `node login.js` di terminal.");
          error.status = 400;
          throw error;
        }

        const executeHttp = async (activeHeaders) => {
          this.requestsCount++;
          return await axios.get(config.gojekTransactionsUrl, {
            headers: activeHeaders,
            params,
            timeout: 10000,
          });
        };

        let response;
        try {
          response = await executeHttp(headers);
        } catch (firstErr) {
          if (firstErr.response && firstErr.response.status === 401) {
            logActivity("WARNING", "Sesi expired (401) ke upstream. Memulai auto-refresh...");
            const refreshed = await sessionService.refreshSession();
            if (refreshed) {
              const newHeaders = await sessionService.getValidHeaders(userAgent);
              response = await executeHttp(newHeaders);
            } else {
              throw firstErr;
            }
          } else {
            throw firstErr;
          }
        }

        const data = response.data;
        // Save to cache
        this.cache.set(cacheKey, { timestamp: Date.now(), data });
        return data;
      } finally {
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, requestPromise);
    return await requestPromise;
  }

  clearCache() {
    this.cache.clear();
    this.inFlightRequests.clear();
  }

  getMetrics() {
    return {
      requestsCount: this.requestsCount,
      cacheSize: this.cache.size,
      inFlightCount: this.inFlightRequests.size,
    };
  }
}

const upstreamClient = new UpstreamClient();

module.exports = {
  UpstreamClient,
  upstreamClient,
};
