const { escapeHtml } = require("../utils/validation");

// Catatan implementasi:
// - lazy: font memakai system stack agar halaman pembayaran 0 request eksternal;
//   upgrade path: self-host Plus Jakarta Sans (woff2 + static route) jika brand font diwajibkan.
// - lazy: script tetap inline di dalam template (arsitektur single-file);
//   ekstrak ke aset statis + CSP nonce saat CSP strict diprioritaskan.
// - Ikon SVG mengikuti gaya stroke icon library (24 viewBox, stroke-width 2) tanpa
//   dependensi frontend; ikon status muncul via class badge, bukan manipulasi DOM.

const pad = (value) => String(value).padStart(2, "0");

function formatRemaining(expiresTimestamp) {
  const remaining = Math.max(0, (Number(expiresTimestamp) || 0) - Date.now());
  const minutes = Math.floor(remaining / 60000);
  return {
    minutes,
    text: `${pad(minutes)}:${pad(Math.floor((remaining % 60000) / 1000))}`,
  };
}

const ICONS = {
  qr: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  clock: `<svg class="icon icon-clock" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>`,
  check: `<svg class="icon icon-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 12 10 17 19 7"/></svg>`,
  checkSm: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 12 10 17 19 7"/></svg>`,
  x: `<svg class="icon icon-x" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>`,
  refresh: `<svg class="icon-refresh" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0 -14.9 -3"/><polyline points="5 4 5 8 9 8"/><path d="M4 13a8 8 0 0 0 14.9 3"/><polyline points="19 20 19 16 15 16"/></svg>`,
};

function renderCheckoutHtml({
  qrisId,
  formattedAmount,
  qrImageUrl,
  expiresTimestamp,
  initialStatus = "PENDING",
  initialTransaction = null,
}) {
  const safeAmount = escapeHtml(formattedAmount);
  const safeQrisId = escapeHtml(qrisId);
  const safeQrImageUrl = escapeHtml(qrImageUrl);
  const safeExpires = Number(expiresTimestamp) || 0;
  const isInitiallyPaid = initialStatus === "PAID";

  const initialTimer = formatRemaining(safeExpires);
  const timerDurationText =
    initialTimer.minutes >= 1 ? `sekitar ${initialTimer.minutes} menit` : "kurang dari satu menit";

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0f172a">
    <title>Pembayaran QRIS - ${safeAmount}</title>
    <style>
        /* Base */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; min-height: 100dvh; padding: 16px; }
        button, input { font: inherit; }
        [hidden] { display: none !important; }

        /* Layout */
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; width: 100%; max-width: 420px; padding: 28px 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }

        /* Komponen */
        .badge-qris { display: inline-flex; align-items: center; gap: 6px; background: rgba(0, 174, 217, 0.15); color: #38bdf8; font-weight: 600; font-size: 13px; padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 16px; }
        .amount-title { font-size: 14px; color: #94a3b8; margin-bottom: 4px; }
        .amount-value { font-size: 28px; font-weight: 700; color: #38bdf8; letter-spacing: -0.5px; margin-bottom: 20px; }
        .qr-wrapper { background: #ffffff; padding: 16px; border-radius: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); margin-bottom: 20px; }
        .qr-wrapper img { display: block; width: 240px; height: 240px; border-radius: 8px; }
        .timer-box { font-size: 14px; color: #cbd5e1; background: #0f172a; padding: 10px 16px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .timer-val { font-weight: 700; color: #f59e0b; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 16px; }

        /* Status */
        .status-badge { display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 14px; padding: 12px; border-radius: 12px; margin-bottom: 20px; transition: all 0.3s ease; }
        .status-pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
        .status-paid { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
        .status-expired { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
        .status-badge .icon { display: none; }
        .status-pending .icon-clock, .status-paid .icon-check, .status-expired .icon-x { display: block; }

        /* Tombol */
        .btn-check { width: 100%; background: #0369a1; color: #ffffff; border: none; font-weight: 600; font-size: 15px; padding: 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(3, 105, 161, 0.3); }
        .btn-check:hover { background: #075985; transform: translateY(-1px); }
        .btn-check:disabled { background: #475569; cursor: not-allowed; opacity: 0.7; transform: none; }
        .btn-check .spinner { display: none; width: 18px; height: 18px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .btn-check.is-checking .spinner { display: inline-block; }
        .btn-check.is-checking .icon-refresh { display: none; }

        /* Toggle */
        .toggle-box { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; color: #94a3b8; margin-top: 16px; }
        .toggle-box input[type="checkbox"] { width: 16px; height: 16px; accent-color: #0369a1; cursor: pointer; }

        /* Feedback */
        .error-box { display: none; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #f87171; text-align: left; margin-top: 16px; }
        .error-box.show { display: block; }
        .success-box { display: none; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; color: #cbd5e1; margin-top: 16px; }
        .success-box.show { display: block; }
        .success-box strong { color: #4ade80; display: flex; align-items: center; gap: 6px; font-size: 15px; margin-bottom: 6px; }
        .success-box strong svg { flex-shrink: 0; }

        /* Utilitas */
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (prefers-reduced-motion: reduce) {
            .status-badge, .btn-check { transition: none; }
            .btn-check:hover { transform: none; }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge-qris">
            ${ICONS.qr}
            GoPay / QRIS Dinamis
        </div>

        <div class="amount-title">Total Pembayaran</div>
        <div class="amount-value">${safeAmount}</div>

        <div class="qr-wrapper" id="qr-container">
            <img src="${safeQrImageUrl}" alt="Kode QRIS pembayaran" width="240" height="240">
        </div>

        <div class="timer-box">
            <span>Batas Waktu Pembayaran</span>
            <span class="timer-val" id="timer-text" aria-hidden="true">${isInitiallyPaid ? "LUNAS" : initialTimer.text}</span>
            ${isInitiallyPaid ? "" : `<span class="sr-only">Batas waktu pembayaran ${timerDurationText}.</span>`}
        </div>

        <div class="status-badge ${isInitiallyPaid ? "status-paid" : "status-pending"}" id="status-badge" role="status" aria-live="polite">
            <span aria-hidden="true">${ICONS.clock}${ICONS.check}${ICONS.x}</span>
            <span id="status-text">${isInitiallyPaid ? "Pembayaran Berhasil / Lunas" : "Menunggu Pembayaran"}</span>
        </div>

        <button class="btn-check" id="btn-check" ${isInitiallyPaid ? "hidden" : ""}>
            <span class="spinner" aria-hidden="true"></span>
            ${ICONS.refresh}
            <span id="btn-label">Cek Status Pembayaran</span>
        </button>

        <div class="toggle-box" id="toggle-container" ${isInitiallyPaid ? "hidden" : ""}>
            <input type="checkbox" id="chk-auto">
            <label for="chk-auto">Cek otomatis setiap 8 detik (opsional)</label>
        </div>

        <div class="error-box" id="error-box" role="alert"></div>

        <div class="success-box${isInitiallyPaid ? " show" : ""}" id="success-details">
            <strong>${ICONS.checkSm}Pembayaran Berhasil!</strong>
            <p>Order ID: <span id="tx-order">${escapeHtml(initialTransaction?.order_id || initialTransaction?.transaction_id || "-")}</span></p>
            <p>Sumber: <span id="tx-issuer">${escapeHtml(initialTransaction?.payer_issuer || "GoPay / Bank")}</span></p>
            <p>Waktu: <span id="tx-time">${escapeHtml(initialTransaction?.transaction_time || "-")}</span></p>
        </div>
    </div>

    <script>
        const qrisId = ${JSON.stringify(safeQrisId)};
        const expiresTimestamp = ${safeExpires};

        const btnCheck = document.getElementById('btn-check');
        const btnLabel = document.getElementById('btn-label');
        const statusBadge = document.getElementById('status-badge');
        const statusText = document.getElementById('status-text');
        const timerText = document.getElementById('timer-text');
        const chkAuto = document.getElementById('chk-auto');
        const toggleContainer = document.getElementById('toggle-container');
        const errorBox = document.getElementById('error-box');
        const successDetails = document.getElementById('success-details');
        const txOrder = document.getElementById('tx-order');
        const txIssuer = document.getElementById('tx-issuer');
        const txTime = document.getElementById('tx-time');

        let isChecking = false;
        let isPaid = ${isInitiallyPaid ? "true" : "false"};
        let isExpired = false;
        let pollTimer = null;
        let countdownInterval = null;
        let errorTimeout = null;

        function showError(message) {
            if (errorTimeout) clearTimeout(errorTimeout);
            errorBox.textContent = message;
            errorBox.classList.add('show');
            errorTimeout = setTimeout(hideError, 4000);
        }

        function hideError() {
            if (errorTimeout) {
                clearTimeout(errorTimeout);
                errorTimeout = null;
            }
            errorBox.classList.remove('show');
        }

        function setExpiredState() {
            isExpired = true;
            timerText.innerText = '00:00';
            statusBadge.className = 'status-badge status-expired';
            statusText.innerText = 'QRIS Kedaluwarsa';
            btnCheck.disabled = true;
            chkAuto.disabled = true;
            if (countdownInterval) clearInterval(countdownInterval);
            stopAutoPoll();
        }

        function updateCountdown() {
            if (isPaid) return;
            const diff = expiresTimestamp - Date.now();

            if (diff <= 0) {
                timerText.innerText = '00:00';
                if (!isChecking && !isExpired) {
                    checkStatusManual().then(() => {
                        if (!isPaid && !isExpired) setExpiredState();
                    });
                }
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            timerText.innerText =
                String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        }

        async function checkStatusManual() {
            if (isChecking || isPaid) return;
            isChecking = true;
            hideError();

            btnCheck.disabled = true;
            btnCheck.classList.add('is-checking');
            btnLabel.innerText = 'Memeriksa...';

            try {
                const res = await fetch('/api/qr-status/' + qrisId);
                const data = await res.json();

                if (data.success && data.paid) {
                    onPaymentSuccess(data.transaction);
                } else if (data.status === 'EXPIRED') {
                    if (!isPaid) setExpiredState();
                } else {
                    statusText.innerText = 'Belum dibayar. Coba lagi.';
                    setTimeout(() => {
                        if (!isPaid && !isExpired) {
                            statusText.innerText = 'Menunggu Pembayaran';
                        }
                    }, 2000);
                }
            } catch (err) {
                console.error('Gagal periksa status:', err);
                showError('Gagal memeriksa status. Periksa koneksi internet Anda lalu coba lagi.');
            } finally {
                isChecking = false;
                btnCheck.classList.remove('is-checking');
                if (!isPaid && !isExpired) {
                    btnCheck.disabled = false;
                }
                btnLabel.innerText = 'Cek Status Pembayaran';
            }
        }

        function onPaymentSuccess(tx) {
            isPaid = true;
            stopAutoPoll();
            if (countdownInterval) clearInterval(countdownInterval);
            hideError();

            timerText.innerText = 'LUNAS';
            statusBadge.className = 'status-badge status-paid';
            statusText.innerText = 'Pembayaran Berhasil / Lunas';

            btnCheck.hidden = true;
            toggleContainer.hidden = true;

            if (tx) {
                txOrder.innerText = tx.order_id || tx.transaction_id || '-';
                txIssuer.innerText = tx.payer_issuer || 'GoPay / Bank';
                txTime.innerText = tx.transaction_time || '-';
                successDetails.classList.add('show');
            }
        }

        function startAutoPoll() {
            stopAutoPoll();
            pollTimer = setInterval(() => {
                if (!isChecking && !isPaid && !isExpired) {
                    checkStatusManual();
                }
            }, 8000);
        }

        function stopAutoPoll() {
            if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
        }

        btnCheck.addEventListener('click', checkStatusManual);
        chkAuto.addEventListener('change', () => {
            if (chkAuto.checked) {
                startAutoPoll();
            } else {
                stopAutoPoll();
            }
        });

        if (!isPaid) {
            countdownInterval = setInterval(updateCountdown, 1000);
            updateCountdown();
            checkStatusManual();
            if (chkAuto.checked) {
                startAutoPoll();
            }
        }
    </script>
</body>
</html>`;
}

module.exports = { renderCheckoutHtml };
