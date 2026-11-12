import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const { initDatabase } = require("../../src/storage/database");
const {
  activityLogs,
  cleanupOldLogs,
  getLogs,
  logActivity,
  setLogDatabase,
} = require("../../src/utils/logger");

describe("Activity log persistence", () => {
  const testDbPath = path.resolve(process.cwd(), "data/test-activity-logs.sqlite");
  let db = null;

  const removeDbFiles = () => {
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  };

  const openDb = () => {
    db = initDatabase(testDbPath);
    return db;
  };

  const closeDb = () => {
    if (db) {
      db.close();
      db = null;
    }
    setLogDatabase(null);
  };

  removeDbFiles();
  openDb();

  afterAll(() => {
    closeDb();
    removeDbFiles();
  });

  test("persists a log entry and round-trips object details", () => {
    logActivity("INFO", "hello persisted", { foo: "bar", count: 1 });

    const logs = getLogs(10);
    const entry = logs.find((item) => item.message === "hello persisted");

    expect(entry).toBeDefined();
    expect(entry.type).toBe("INFO");
    expect(entry.details).toEqual({ foo: "bar", count: 1 });
    expect(typeof entry.id).toBe("number");
  });

  test("keeps logs readable after reopening the database", () => {
    closeDb();
    openDb();

    const logs = getLogs(10);
    const entry = logs.find((item) => item.message === "hello persisted");

    expect(entry).toBeDefined();
    expect(entry.details).toEqual({ foo: "bar", count: 1 });
  });

  test("cleanupOldLogs deletes rows older than the retention window", () => {
    const oldIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    db.query(
      "INSERT INTO activity_logs (timestamp, type, message, details, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(oldIso, "INFO", "old entry", null, oldIso);
    logActivity("INFO", "fresh entry");

    const changes = cleanupOldLogs(1);

    expect(changes).toBeGreaterThanOrEqual(1);
    const messages = getLogs(100).map((item) => item.message);
    expect(messages).not.toContain("old entry");
    expect(messages).toContain("fresh entry");
  });

  test("falls back to in-memory logs when no database is attached", () => {
    closeDb();
    activityLogs.length = 0;

    logActivity("INFO", "memory only");

    const logs = getLogs(10);
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe("memory only");
  });
});
