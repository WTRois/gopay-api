/**
 * Benchmark Script for GoPay Merchant Gateway on Bun Runtime.
 * Measures startup time, memory consumption (RSS, Heap), and HTTP latency.
 */

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

async function measureLatency(iterations = 200) {
  const latencies = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const res = await fetch(`${BASE_URL}/health`);
    await res.json();
    const duration = performance.now() - start;
    latencies.push(duration);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(iterations * 0.5)];
  const p95 = latencies[Math.floor(iterations * 0.95)];
  const p99 = latencies[Math.floor(iterations * 0.99)];
  const avg = latencies.reduce((sum, val) => sum + val, 0) / iterations;

  return {
    iterations,
    avg,
    p50,
    p95,
    p99,
    min: latencies[0],
    max: latencies[latencies.length - 1],
  };
}

async function runBenchmark() {
  console.log("=== GoPay Merchant Gateway — Bun Performance Benchmark ===");
  console.log(`Runtime: Bun v${Bun.version} (${process.platform} ${process.arch})`);

  // Memory usage of benchmark process
  const mem = process.memoryUsage();
  console.log("\n--- Process Memory Footprint ---");
  console.log(`RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);

  console.log("\n--- Benchmarking Local HTTP Endpoint (/health) ---");
  try {
    const stats = await measureLatency(300);
    console.log(`Total Requests: ${stats.iterations}`);
    console.log(`Average Latency: ${stats.avg.toFixed(2)} ms`);
    console.log(`p50 Latency: ${stats.p50.toFixed(2)} ms`);
    console.log(`p95 Latency: ${stats.p95.toFixed(2)} ms`);
    console.log(`p99 Latency: ${stats.p99.toFixed(2)} ms`);
    console.log(`Min Latency: ${stats.min.toFixed(2)} ms`);
    console.log(`Max Latency: ${stats.max.toFixed(2)} ms`);
  } catch (err) {
    console.log(`Could not reach ${BASE_URL} (Server offline or different port): ${err.message}`);
  }
}

runBenchmark();
