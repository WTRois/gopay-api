const { logActivity } = require("../utils/logger");

const MIGRATIONS = [
  {
    version: 1,
    name: "initial_schema",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          trx_id TEXT UNIQUE NOT NULL,
          amount INTEGER NOT NULL,
          qris_payload TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          paid_at TEXT,
          upstream_transaction_id TEXT,
          payment_metadata TEXT
        );

        CREATE TABLE IF NOT EXISTS transaction_claims (
          upstream_transaction_id TEXT PRIMARY KEY,
          payment_id TEXT NOT NULL,
          claimed_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
        CREATE INDEX IF NOT EXISTS idx_payments_expires ON payments(expires_at);
        CREATE INDEX IF NOT EXISTS idx_payments_trx_id ON payments(trx_id);
      `);
    },
  },
  {
    version: 2,
    name: "relax_transaction_claims_fk",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS transaction_claims_v2 (
          upstream_transaction_id TEXT PRIMARY KEY,
          payment_id TEXT NOT NULL,
          claimed_at TEXT NOT NULL
        );
        INSERT OR IGNORE INTO transaction_claims_v2 SELECT * FROM transaction_claims;
        DROP TABLE IF EXISTS transaction_claims;
        ALTER TABLE transaction_claims_v2 RENAME TO transaction_claims;
      `);
    },
  },
];

function runMigrations(db) {
  const currentVersionRow = db.query("PRAGMA user_version;").get();
  const currentVersion = currentVersionRow ? Object.values(currentVersionRow)[0] : 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      logActivity("SYSTEM", `Running database migration v${migration.version}: ${migration.name}`);
      db.transaction(() => {
        migration.up(db);
        db.exec(`PRAGMA user_version = ${migration.version};`);
      })();
      logActivity("SYSTEM", `Database migration v${migration.version} applied successfully.`);
    }
  }
}

module.exports = {
  runMigrations,
};
