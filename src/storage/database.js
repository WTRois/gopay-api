const fs = require("node:fs");
const path = require("node:path");
const { Database } = require("bun:sqlite");
const config = require("../config/env");
const { runMigrations } = require("./migrations");
const { logActivity, setLogDatabase } = require("../utils/logger");

let dbInstance = null;

function initDatabase(customPath = null) {
  const dbPath = customPath || config.dbPath;

  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);

  // WAL mode for concurrency, FK constraints enabled
  if (dbPath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
  }
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  runMigrations(db);
  setLogDatabase(db);
  logActivity("SYSTEM", `Database SQLite terhubung: ${dbPath}`);

  return db;
}

function getDatabase() {
  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  return dbInstance;
}

function closeDatabase() {
  // Detach before closing so no log write hits a closed handle.
  setLogDatabase(null);
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (_e) {
      // ignore
    }
    dbInstance = null;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
};
