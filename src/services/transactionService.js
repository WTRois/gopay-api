const config = require("../config/env");
const { upstreamClient } = require("./upstreamClient");

async function fetchFormattedTransactions({
  startTime,
  endTime,
  pageSize = 20,
  merchantId = null,
  userAgent = null,
}) {
  const effectiveMerchantId = merchantId || config.gopayMerchantId || "";
  const now = new Date();
  const startTimeISO = startTime
    ? new Date(parseInt(startTime, 10) * 1000).toISOString()
    : new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString();
  const endTimeISO = endTime
    ? new Date(parseInt(endTime, 10) * 1000).toISOString()
    : now.toISOString();

  const params = {
    from: 0,
    size: parseInt(pageSize, 10),
    statuses: "SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND",
    payment_types: "QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD",
    start_time: startTimeISO,
    end_time: endTimeISO,
    merchant_ids: effectiveMerchantId,
  };

  const response = await upstreamClient.fetchTransactions(params, userAgent);
  const rawTransactions = response?.transactions || response?.data?.transactions || [];

  const formattedTransactions = rawTransactions.map((tx) => ({
    amount: parseInt(tx.gross_amount || tx.real_gross_amount || 0, 10),
    status: tx.transaction_status ? tx.transaction_status.toLowerCase() : "success",
    time: tx.transaction_time || tx.settlement_time,
    issuer: tx.qris_provider_aspi_issuer || "GoPay / Bank",
    order_id: tx.order_id,
    transaction_id: tx.id,
  }));

  const totalAmount = String(formattedTransactions.reduce((total, tx) => total + tx.amount, 0));

  return {
    transactions: formattedTransactions,
    total_amount: totalAmount,
  };
}

module.exports = {
  fetchFormattedTransactions,
};
