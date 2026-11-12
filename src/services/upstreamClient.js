const axios = require("axios");
const config = require("../config/env");
const { PAYMENT_TYPES, TRANSACTION_STATUSES } = require("../config/constants");
const { logActivity } = require("../utils/logger");
const sessionService = require("./sessionService");

class UpstreamClient {
  constructor() {
    this.cache = new Map(); // cacheKey -> { timestamp, data }
    this.inFlightRequests = new Map(); // cacheKey -> Promise
    this.requestsCount = 0;
  }

  get cacheTtl() {
    return config.upstreamCacheTtlMs || 5000;
  }

  _buildCacheKey(params) {
    return JSON.stringify(params);
  }

  /**
   * Executes one upstream HTTP call, refreshing the session once on 401.
   */
  async _request(params, userAgent) {
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

    try {
      const response = await executeHttp(headers);
      return response.data;
    } catch (err) {
      if (err.response && err.response.status === 401) {
        logActivity("WARNING", "Sesi expired (401) ke upstream. Memulai auto-refresh...");
        const refreshed = await sessionService.refreshSession();
        if (refreshed) {
          const newHeaders = await sessionService.getValidHeaders(userAgent);
          const response = await executeHttp(newHeaders);
          return response.data;
        }
      }
      throw err;
    }
  }

  /**
   * TTL cache + single-flight coalescing around an upstream request.
   */
  async _fetchWithCache(cacheKey, params, userAgent) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }

    if (this.inFlightRequests.has(cacheKey)) {
      return await this.inFlightRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const data = await this._request(params, userAgent);
        this.cache.set(cacheKey, { timestamp: Date.now(), data });
        return data;
      } finally {
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, requestPromise);
    return await requestPromise;
  }

  /**
   * Exact-window fetch used for transaction history listings.
   */
  async fetchTransactions(params, userAgent = null) {
    return await this._fetchWithCache(this._buildCacheKey(params), params, userAgent);
  }

  /**
   * One shared "recent transactions" fetch per merchant/window/size, reused by
   * every pending payment and filtered locally by the caller. The cache key
   * intentionally excludes precise timestamps so sequential polls hit the cache.
   */
  async fetchRecentTransactions({ merchantId, userAgent = null, windowHours, size } = {}) {
    const hours = windowHours ?? config.upstreamWindowHours;
    const pageSize = size ?? config.upstreamRecentPageSize;
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const params = {
      from: 0,
      size: pageSize,
      statuses: TRANSACTION_STATUSES,
      payment_types: PAYMENT_TYPES,
      start_time: startTime.toISOString(),
      end_time: now.toISOString(),
      merchant_ids: merchantId || config.gopayMerchantId || "",
    };

    const cacheKey = `recent:${params.merchant_ids}:${hours}:${pageSize}`;
    return await this._fetchWithCache(cacheKey, params, userAgent);
  }

  clearCache() {
    this.cache.clear();
    this.inFlightRequests.clear();
  }
}

const upstreamClient = new UpstreamClient();

module.exports = {
  UpstreamClient,
  upstreamClient,
};
