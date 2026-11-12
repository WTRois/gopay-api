/**
 * Tiny bounded cache with optional TTL and FIFO eviction.
 * lazy: FIFO is sufficient for per-QRIS artifacts that are immutable until they
 * expire; upgrade to true LRU if hit patterns become skewed.
 */
class MemoryCache {
  constructor({ maxEntries = 1000 } = {}) {
    this.maxEntries = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = 0) {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0,
    });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

module.exports = {
  MemoryCache,
};
