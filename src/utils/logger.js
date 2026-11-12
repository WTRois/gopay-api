const config = require("../config/env");

const activityLogs = [];

// Injected by database.js via setLogDatabase() to avoid a circular require.
let logDb = null;
let insertLogStmt = null;

const INSERT_LOG_SQL =
  "INSERT INTO activity_logs (timestamp, type, message, details, created_at) VALUES (?, ?, ?, ?, ?)";

function setLogDatabase(db) {
  logDb = db || null;
  insertLogStmt = null;
  if (logDb) {
    try {
      insertLogStmt = logDb.query(INSERT_LOG_SQL);
    } catch (_e) {
      // Table missing or invalid handle: keep in-memory behaviour only.
      logDb = null;
    }
  }
}

function parseDetails(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

function logActivity(type, message, details = null) {
  const timestamp = new Date().toISOString();
  const logObj = { id: Date.now(), timestamp, type, message, details };
  activityLogs.unshift(logObj);
  if (activityLogs.length > config.maxLogs) {
    activityLogs.pop();
  }
  // Persistence must never break logging.
  if (logDb && insertLogStmt) {
    try {
      const serialized = details === null || details === undefined ? null : JSON.stringify(details);
      const result = insertLogStmt.run(timestamp, type, message, serialized, timestamp);
      logObj.id = Number(result.lastInsertRowid);
    } catch (_e) {
      // ignore: fall back to in-memory only
    }
  }
  // Suppress verbose console output in test mode to keep test runs clean
  if (config.env !== "test") {
    console.log(`[${timestamp}] [${type}] ${message}`);
  }
  return logObj;
}

function getLogs(limit = config.maxLogs) {
  if (logDb) {
    try {
      const rows = logDb
        .query(
          "SELECT id, timestamp, type, message, details FROM activity_logs ORDER BY id DESC LIMIT ?",
        )
        .all(limit);
      return rows.map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        type: row.type,
        message: row.message,
        details: parseDetails(row.details),
      }));
    } catch (_e) {
      // ignore: fall back to in-memory logs
    }
  }
  return activityLogs.slice(0, limit);
}

function cleanupOldLogs(retentionDays = config.logRetentionDays) {
  if (!logDb) return 0;
  try {
    const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const result = logDb.query("DELETE FROM activity_logs WHERE timestamp < ?").run(cutoffIso);
    return result.changes;
  } catch (_e) {
    return 0;
  }
}

module.exports = {
  activityLogs,
  logActivity,
  setLogDatabase,
  getLogs,
  cleanupOldLogs,
};
