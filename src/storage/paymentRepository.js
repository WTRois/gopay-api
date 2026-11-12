const { getDatabase } = require("./database");

class PaymentRepository {
  constructor(db = null) {
    this._db = db;
    this._statements = new Map();
    this._statementsDb = null;
  }

  get db() {
    return this._db || getDatabase();
  }

  /**
   * Returns a cached prepared statement for a given SQL string.
   * Statements are rebound whenever the underlying database instance changes
   * (e.g. tests that close and reopen the connection).
   */
  _statement(sql) {
    const db = this.db;
    if (this._statementsDb !== db) {
      this._statements = new Map();
      this._statementsDb = db;
    }

    let statement = this._statements.get(sql);
    if (!statement) {
      statement = db.prepare(sql);
      this._statements.set(sql, statement);
    }
    return statement;
  }

  createPayment({ id, trxId, amount, qrisPayload, expiresAt, createdAt, status = "PENDING" }) {
    this._statement(`
      INSERT INTO payments (id, trx_id, amount, qris_payload, status, created_at, expires_at)
      VALUES ($id, $trxId, $amount, $qrisPayload, $status, $createdAt, $expiresAt)
    `).run({
      $id: id,
      $trxId: trxId,
      $amount: amount,
      $qrisPayload: qrisPayload,
      $status: status,
      $createdAt: typeof createdAt === "string" ? createdAt : createdAt.toISOString(),
      $expiresAt: typeof expiresAt === "string" ? expiresAt : expiresAt.toISOString(),
    });

    return this.getPayment(id);
  }

  getPayment(id) {
    const row = this._statement("SELECT * FROM payments WHERE id = ?").get(id);
    if (!row) return null;
    return this._mapRow(row);
  }

  getPaymentByTrxId(trxId) {
    const row = this._statement("SELECT * FROM payments WHERE trx_id = ?").get(trxId);
    if (!row) return null;
    return this._mapRow(row);
  }

  updatePaymentStatus(id, status, paidAt = null, upstreamTransactionId = null, metadata = null) {
    this._statement(`
      UPDATE payments
      SET status = $status,
          paid_at = COALESCE($paidAt, paid_at),
          upstream_transaction_id = COALESCE($upstreamTransactionId, upstream_transaction_id),
          payment_metadata = COALESCE($metadata, payment_metadata)
      WHERE id = $id
    `).run({
      $id: id,
      $status: status,
      $paidAt: paidAt ? (typeof paidAt === "string" ? paidAt : paidAt.toISOString()) : null,
      $upstreamTransactionId: upstreamTransactionId,
      $metadata: metadata
        ? typeof metadata === "string"
          ? metadata
          : JSON.stringify(metadata)
        : null,
    });

    return this.getPayment(id);
  }

  getClaim(upstreamTransactionId) {
    return this._statement(
      "SELECT * FROM transaction_claims WHERE upstream_transaction_id = ?",
    ).get(upstreamTransactionId);
  }

  /**
   * Atomically claims an upstream transaction for a given payment.
   * Ensures zero race conditions and anti-double-claim guarantees.
   */
  claimTransaction(upstreamTransactionId, paymentId) {
    return this.db.transaction(() => {
      const existing = this.getClaim(upstreamTransactionId);

      if (existing) {
        if (existing.payment_id === paymentId) {
          return { success: true, claimed: true, isSamePayment: true };
        }
        return { success: false, claimed: false, claimedBy: existing.payment_id };
      }

      this._statement(`
        INSERT INTO transaction_claims (upstream_transaction_id, payment_id, claimed_at)
        VALUES (?, ?, ?)
      `).run(upstreamTransactionId, paymentId, new Date().toISOString());

      return { success: true, claimed: true, isNew: true };
    })();
  }

  markExpiredPayments(nowIso = new Date().toISOString()) {
    const result = this._statement(`
      UPDATE payments
      SET status = 'EXPIRED'
      WHERE status = 'PENDING' AND expires_at < ?
    `).run(nowIso);
    return result.changes;
  }

  cleanupOldClaims(cutoffIso) {
    const result = this._statement(`
      DELETE FROM transaction_claims
      WHERE claimed_at < ?
    `).run(cutoffIso);
    return result.changes;
  }

  _mapRow(row) {
    return {
      id: row.id,
      trxId: row.trx_id,
      amount: row.amount,
      data: row.qris_payload,
      status: row.status,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      paidAt: row.paid_at ? new Date(row.paid_at) : null,
      upstreamTransactionId: row.upstream_transaction_id,
      transaction: row.payment_metadata ? JSON.parse(row.payment_metadata) : null,
    };
  }
}

const paymentRepository = new PaymentRepository();

module.exports = {
  PaymentRepository,
  paymentRepository,
};
