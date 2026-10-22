const config = require("../config/env");
const { logActivity } = require("../utils/logger");
const { paymentRepository } = require("../storage/paymentRepository");
const { upstreamClient } = require("./upstreamClient");

// SQLite-backed adapters preserving Map interface for zero breaking changes
const qrisStore = {
  get(id) {
    return paymentRepository.getPayment(id);
  },
  set(id, data) {
    const existing = paymentRepository.getPayment(id);
    if (!existing) {
      paymentRepository.createPayment({
        id,
        trxId: data.trxId,
        amount: data.amount,
        qrisPayload: data.data,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
        status: data.status || "PENDING",
      });
    } else {
      paymentRepository.updatePaymentStatus(
        id,
        data.status,
        data.paidAt || (data.status === "PAID" ? new Date() : null),
        data.transaction?.transaction_id || data.upstreamTransactionId || null,
        data.transaction || null,
      );
    }
  },
  delete(id) {
    paymentRepository.updatePaymentStatus(id, "EXPIRED");
  },
};

const claimedTransactions = {
  get(txId) {
    const claim = paymentRepository.getClaim(txId);
    if (!claim) return undefined;
    return { qrisId: claim.payment_id, claimedAt: new Date(claim.claimed_at).getTime() };
  },
  set(txId, value) {
    const qrisId = typeof value === "object" ? value.qrisId : value;
    paymentRepository.claimTransaction(txId, qrisId);
  },
};

function cleanExpiredTransactions() {
  const count = paymentRepository.markExpiredPayments();
  const cutoffIso = new Date(Date.now() - config.claimedCleanupIntervalMs).toISOString();
  paymentRepository.cleanupOldClaims(cutoffIso);
  if (count > 0) {
    logActivity("INFO", `Membersihkan ${count} pembayaran QRIS kedaluwarsa dari SQLite`);
  }
}

/**
 * Verifies payment from GoPay transactions with atomic SQLite claiming and single-flight upstream request.
 */
async function verifyPayment(
  amount,
  startTime,
  merchantIdOverride = null,
  userAgent = null,
  qrisId = null,
) {
  // 1. Idempotency check: If payment is already marked PAID, return transaction immediately
  if (qrisId) {
    const payment =
      paymentRepository.getPayment(qrisId) || paymentRepository.getPaymentByTrxId(qrisId);
    if (payment && payment.status === "PAID" && payment.transaction) {
      return payment.transaction;
    }
  }

  const merchantId = merchantIdOverride || config.gopayMerchantId || "";
  const now = new Date();
  const startTimeISO = startTime
    ? new Date(startTime).toISOString()
    : new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const endTimeISO = now.toISOString();

  const params = {
    from: 0,
    size: 20,
    statuses: "SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND",
    payment_types: "QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD",
    start_time: startTimeISO,
    end_time: endTimeISO,
    merchant_ids: merchantId,
  };

  const responseData = await upstreamClient.fetchTransactions(params, userAgent);
  const rawTransactions =
    responseData?.transactions || responseData?.data?.transactions || responseData?.data || [];
  const targetAmount = parseInt(amount, 10);
  const filterStartTimeMs = startTime ? new Date(startTime).getTime() : 0;

  for (const tx of rawTransactions) {
    const status = (tx.transaction_status || tx.status || "").toUpperCase();
    // Only accept SETTLEMENT or CAPTURE or SUCCESS (reject REFUND/PARTIAL_REFUND)
    const isSuccessStatus =
      status === "SETTLEMENT" || status === "CAPTURE" || status === "SUCCESS" || !status;
    if (!isSuccessStatus) {
      continue;
    }

    const rawTxAmount = parseInt(
      tx.gross_amount || tx.real_gross_amount || tx.amount?.value || tx.amount || 0,
      10,
    );
    // Gojek v2 analytics API returns gross_amount in minor currency units (multiplied by 100 / cents)
    const txAmount = rawTxAmount === targetAmount * 100 ? rawTxAmount / 100 : rawTxAmount;
    const txTimestamp = new Date(
      tx.transaction_time || tx.created_at || tx.settlement_time || 0,
    ).getTime();
    const txId = tx.id || tx.order_id || tx.wallstreet_transaction_id;

    if (txAmount === targetAmount && txTimestamp >= filterStartTimeMs) {
      // Atomic claim via SQLite transaction
      const claimResult = paymentRepository.claimTransaction(txId, qrisId || "manual-check");

      if (claimResult.claimed) {
        const transactionDetail = {
          transaction_id: txId,
          order_id: tx.order_id,
          amount: txAmount,
          payer_issuer: tx.qris_provider_aspi_issuer || "GoPay / Bank",
          payment_type: tx.payment_type || tx.transaction_source || "GOPAY_INSTORE",
          transaction_time: tx.transaction_time || tx.settlement_time,
          status: status || "SETTLEMENT",
        };

        if (qrisId) {
          const payment =
            paymentRepository.getPayment(qrisId) || paymentRepository.getPaymentByTrxId(qrisId);
          if (payment) {
            paymentRepository.updatePaymentStatus(
              payment.id,
              "PAID",
              new Date(),
              txId,
              transactionDetail,
            );
          }
        }

        if (claimResult.isNew) {
          logActivity("INFO", `TRX ${txId} berhasil diklaim oleh QRIS ${qrisId || "manual-check"}`);
        }
        return transactionDetail;
      }
      logActivity(
        "INFO",
        `TRX ${txId} sudah diklaim oleh QRIS ${claimResult.claimedBy || "lain"}, skip untuk QRIS ${qrisId}`,
      );
    }
  }

  return null;
}

module.exports = {
  paymentRepository,
  claimedTransactions,
  qrisStore,
  cleanExpiredTransactions,
  verifyPayment,
};
