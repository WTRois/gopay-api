import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const { PaymentRepository } = require("../../src/storage/paymentRepository");
const { runMigrations } = require("../../src/storage/migrations");

describe("SQLite Persistence & Atomic Claims", () => {
  const testDbPath = path.resolve(process.cwd(), "data/test-persistence.sqlite");
  let db;
  let repo;

  beforeAll(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    const dir = path.dirname(testDbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(testDbPath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    runMigrations(db);
    repo = new PaymentRepository(db);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  });

  test("creates and retrieves payment", () => {
    const payment = repo.createPayment({
      id: "qris-test-1",
      trxId: "TRX-TEST-0001",
      amount: 50000,
      qrisPayload: "000201...",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300000),
    });

    expect(payment).toBeDefined();
    expect(payment.id).toBe("qris-test-1");
    expect(payment.amount).toBe(50000);
    expect(payment.status).toBe("PENDING");

    const fetched = repo.getPayment("qris-test-1");
    expect(fetched.trxId).toBe("TRX-TEST-0001");
  });

  test("claims transaction atomically and prevents double claim", () => {
    // First claim by qris-test-1
    const res1 = repo.claimTransaction("UPSTREAM-TX-999", "qris-test-1");
    expect(res1.claimed).toBe(true);
    expect(res1.isNew).toBe(true);

    // Idempotent re-claim by same payment
    const resSame = repo.claimTransaction("UPSTREAM-TX-999", "qris-test-1");
    expect(resSame.claimed).toBe(true);
    expect(resSame.isSamePayment).toBe(true);

    // Conflicting claim by different payment (e.g. qris-test-2)
    const res2 = repo.claimTransaction("UPSTREAM-TX-999", "qris-test-2");
    expect(res2.claimed).toBe(false);
    expect(res2.claimedBy).toBe("qris-test-1");
  });

  test("survives restart across connection recreation", () => {
    // Update payment status
    repo.updatePaymentStatus("qris-test-1", "PAID", new Date(), "UPSTREAM-TX-999", {
      issuer: "GoPay",
    });

    // Close database connection
    db.close();

    // Reopen same database file
    const reopenedDb = new Database(testDbPath);
    const newRepo = new PaymentRepository(reopenedDb);

    const restoredPayment = newRepo.getPayment("qris-test-1");
    expect(restoredPayment).toBeDefined();
    expect(restoredPayment.status).toBe("PAID");
    expect(restoredPayment.transaction.issuer).toBe("GoPay");

    const claim = newRepo.getClaim("UPSTREAM-TX-999");
    expect(claim).toBeDefined();
    expect(claim.payment_id).toBe("qris-test-1");

    reopenedDb.close();
  });
});
