<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Activity } from "lucide-vue-next";
import { usePaymentAudio } from "~/composables/usePaymentAudio";

const route = useRoute();
const qrisId = route.params.id as string;

const {
  isMuted,
  isPlaying,
  activeVoiceMode,
  setVoiceMode,
  playPaymentSuccess,
  toggleMute,
  testSound,
} = usePaymentAudio();

interface StatusResponse {
  success: boolean;
  paid?: boolean;
  status: "PENDING" | "PAID" | "EXPIRED" | "NOT_FOUND";
  message?: string;
  amount?: number;
  merchant_name?: string;
  merchant_city?: string;
  transaction?: {
    amount?: number;
    issuer?: string;
    payer_name?: string;
    timestamp?: string;
    reference_id?: string;
    [key: string]: any;
  };
}

const statusData = ref<StatusResponse | null>(null);
const isPolling = ref(true);
const isChecking = ref(false);
const remainingSeconds = ref(300);
const copied = ref(false);
const hasPlayedAudio = ref(false);

let pollInterval: ReturnType<typeof setInterval> | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;

const formattedTimer = computed(() => {
  const m = Math.floor(remainingSeconds.value / 60);
  const s = remainingSeconds.value % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
});

const qrImageUrl = computed(() => `/api/qr-image/${qrisId}`);
const nativeCheckoutUrl = computed(() => `http://localhost:3000/qr/${qrisId}`);

useHead({
  title: computed(() => {
    if (statusData.value?.status === "PAID") return "Pembayaran Lunas";
    const amt = statusData.value?.amount;
    return amt ? `Bayar Rp ${Number(amt).toLocaleString("id-ID")}` : "Pembayaran QRIS";
  }),
});

async function checkStatus() {
  if (statusData.value?.status === "PAID" || statusData.value?.status === "EXPIRED") return;

  try {
    isChecking.value = true;
    const res = await $fetch<StatusResponse>(`/api/qr-status/${qrisId}`);
    statusData.value = res;

    if (res.status === "PAID") {
      stopPolling();
      if (!hasPlayedAudio.value) {
        hasPlayedAudio.value = true;
        const paidAmount = res.transaction?.amount || 0;
        playPaymentSuccess(paidAmount);
      }
    } else if (res.status === "EXPIRED" || res.status === "NOT_FOUND") {
      stopPolling();
    }
  } catch (err) {
    console.error("Polling error:", err);
  } finally {
    isChecking.value = false;
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(checkStatus, 3000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function togglePolling() {
  isPolling.value = !isPolling.value;
  if (isPolling.value) {
    startPolling();
  } else {
    stopPolling();
  }
}

function copyId() {
  if (navigator?.clipboard) {
    navigator.clipboard.writeText(qrisId);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}

const isCopyingQr = ref(false);
const qrCopied = ref(false);

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

async function generateStyledQrCardBlob(): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Gagal memuat gambar QR"));
    img.src = qrImageUrl.value;
  });

  const cardW = 420;
  const cardH = 530;
  const dpr = 2; // Hi-DPI retina sharpness

  const canvas = document.createElement("canvas");
  canvas.width = cardW * dpr;
  canvas.height = cardH * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context tidak tersedia");

  ctx.scale(dpr, dpr);

  // 1. Solid Pure White Background & Subtle Card Edge
  ctx.fillStyle = "#FFFFFF";
  drawRoundRect(ctx, 0, 0, cardW, cardH, 16);
  ctx.fill();

  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top Accent Stripe (Crisp 4px Brand Bar)
  ctx.save();
  drawRoundRect(ctx, 0, 0, cardW, cardH, 16);
  ctx.clip();
  ctx.fillStyle = "#689D4B"; // Brand Primary
  ctx.fillRect(0, 0, cardW, 4);
  ctx.restore();

  const px = 28; // Standard horizontal padding

  // 2. Header Brand Section
  let y = 30;

  // Left: Brand Mark
  ctx.font = "900 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("QRIS", px, y);

  ctx.font = "700 11px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#689D4B";
  ctx.fillText("DINAMIS", px + 38, y);

  // Right: Live Status Pill
  const statusW = 86;
  const statusH = 22;
  const statusX = cardW - px - statusW;
  const statusY = y - statusH / 2;
  drawRoundRect(ctx, statusX, statusY, statusW, statusH, 6);
  ctx.fillStyle = "#F0FDF4";
  ctx.fill();
  ctx.strokeStyle = "#DCFCE7";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Green pulse dot
  ctx.beginPath();
  ctx.arc(statusX + 12, y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#16A34A";
  ctx.fill();

  ctx.font = "700 9.5px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#166534";
  ctx.textAlign = "left";
  ctx.fillText("REALTIME", statusX + 22, y);

  // 3. Merchant Info Block
  y += 28;
  const merchantName = statusData.value?.merchant_name || "GoPay Merchant";
  ctx.font = "700 17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#0F172A";
  ctx.textAlign = "left";
  ctx.fillText(merchantName, px, y);

  y += 18;
  const city = statusData.value?.merchant_city ? `${statusData.value.merchant_city} • ` : "";
  ctx.font = "500 11px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#64748B";
  ctx.fillText(`${city}Terverifikasi Resmi`, px, y);

  // Hairline Divider
  y += 18;
  ctx.beginPath();
  ctx.moveTo(px, y);
  ctx.lineTo(cardW - px, y);
  ctx.strokeStyle = "#F1F5F9";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4. Hero Amount (Invoice Style Typography)
  y += 20;
  ctx.font = "700 10px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#94A3B8";
  ctx.textAlign = "left";
  ctx.fillText("TOTAL PEMBAYARAN", px, y);

  // Right Note
  ctx.textAlign = "right";
  ctx.font = "600 10px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#689D4B";
  ctx.fillText("Pastikan nominal pas", cardW - px, y);

  y += 26;
  const amountVal = statusData.value?.amount || statusData.value?.transaction?.amount || 0;
  const formattedAmount =
    amountVal > 0
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(amountVal)
      : "Sesuai Tagihan";

  ctx.textAlign = "left";
  ctx.font = "900 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#0F172A";
  ctx.fillText(formattedAmount, px, y);

  // 5. QR Code Framing with Scanner Reticle Focus Corners
  y += 22;
  const qrFrameSize = 246;
  const qrFrameX = (cardW - qrFrameSize) / 2;
  const qrFrameY = y;

  // Background box for QR code
  drawRoundRect(ctx, qrFrameX, qrFrameY, qrFrameSize, qrFrameSize, 12);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4 Reticle Focus Corner Brackets in Brand Primary (#689D4B)
  const cornerLen = 14;
  ctx.strokeStyle = "#689D4B";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(qrFrameX, qrFrameY + cornerLen);
  ctx.lineTo(qrFrameX, qrFrameY);
  ctx.lineTo(qrFrameX + cornerLen, qrFrameY);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(qrFrameX + qrFrameSize - cornerLen, qrFrameY);
  ctx.lineTo(qrFrameX + qrFrameSize, qrFrameY);
  ctx.lineTo(qrFrameX + qrFrameSize, qrFrameY + cornerLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(qrFrameX, qrFrameY + qrFrameSize - cornerLen);
  ctx.lineTo(qrFrameX, qrFrameY + qrFrameSize);
  ctx.lineTo(qrFrameX + cornerLen, qrFrameY + qrFrameSize);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(qrFrameX + qrFrameSize - cornerLen, qrFrameY + qrFrameSize);
  ctx.lineTo(qrFrameX + qrFrameSize, qrFrameY + qrFrameSize);
  ctx.lineTo(qrFrameX + qrFrameSize, qrFrameY + qrFrameSize - cornerLen);
  ctx.stroke();

  // Draw QR Image inside with safe quiet zone
  const qrPad = 12;
  const qrDrawSize = qrFrameSize - qrPad * 2;
  ctx.drawImage(img, qrFrameX + qrPad, qrFrameY + qrPad, qrDrawSize, qrDrawSize);

  // 6. Payment Instruction
  y += qrFrameSize + 20;
  ctx.textAlign = "center";
  ctx.font = "600 11.5px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#334155";
  ctx.fillText("Bisa discan dengan m-Banking & E-Wallet apapun", cardW / 2, y);

  y += 16;
  ctx.font = "500 10px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#64748B";
  ctx.fillText("GoPay • BCA • Mandiri • BRI • BNI • Dana • OVO • ShopeePay", cardW / 2, y);

  // 7. Hairline Divider & Footer Meta
  y += 18;
  ctx.beginPath();
  ctx.moveTo(px, y);
  ctx.lineTo(cardW - px, y);
  ctx.strokeStyle = "#F1F5F9";
  ctx.lineWidth = 1;
  ctx.stroke();

  y += 16;
  ctx.textAlign = "left";
  ctx.font = "500 9.5px monospace, system-ui";
  ctx.fillStyle = "#94A3B8";
  ctx.fillText(`ID Order: ${qrisId}`, px, y);

  ctx.textAlign = "right";
  ctx.font = "600 9.5px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#689D4B";
  ctx.fillText("GoPay Merchant Gateway", cardW - px, y);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Gagal mengonversi canvas ke Blob"));
    }, "image/png");
  });
}

async function copyQrImage() {
  try {
    isCopyingQr.value = true;
    const cardBlob = await generateStyledQrCardBlob();

    if (navigator.clipboard && "write" in navigator.clipboard) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": cardBlob })]);
      qrCopied.value = true;
      setTimeout(() => {
        qrCopied.value = false;
      }, 2500);
    } else {
      await downloadQrImage();
    }
  } catch (err) {
    console.warn("Gagal salin kartu QR ke clipboard, fallback ke download:", err);
    await downloadQrImage();
  } finally {
    isCopyingQr.value = false;
  }
}

async function downloadQrImage() {
  try {
    const cardBlob = await generateStyledQrCardBlob();
    const url = URL.createObjectURL(cardBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `QRIS-${qrisId}.png`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (_e) {
    const link = document.createElement("a");
    link.href = qrImageUrl.value;
    link.download = `QRIS-${qrisId}.png`;
    link.click();
  }
}

onMounted(() => {
  checkStatus();
  startPolling();

  timerInterval = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value -= 1;
    } else {
      if (statusData.value?.status === "PENDING") {
        checkStatus();
      }
    }
  }, 1000);
});

onUnmounted(() => {
  stopPolling();
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<template>
  <div class="max-w-md mx-auto space-y-3 sm:space-y-4">
    <!-- Top Nav Action -->
    <div class="flex items-center justify-between text-xs px-1">
      <NuxtLink to="/" class="inline-flex items-center gap-1 font-medium text-base-content/70 hover:text-base-content">
        &larr; Beranda
      </NuxtLink>
      <a :href="nativeCheckoutUrl" target="_blank" class="text-base-content/60 hover:text-primary font-mono text-[11px] underline">
        Backend :3000/qr &nearr;
      </a>
    </div>

    <!-- Audio Settings Bar -->
    <div class="bg-base-100 border border-base-300 rounded-lg p-2.5 text-[11px] space-y-2">
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 font-medium hover:opacity-80 transition"
          @click="toggleMute"
        >
          <span v-if="isMuted" class="text-accent font-bold">🔇 Suara Nonaktif</span>
          <span v-else class="text-primary font-bold">🔔 Suara Notifikasi</span>
        </button>

        <button
          type="button"
          class="text-primary font-medium hover:underline flex items-center gap-1 active:scale-95 transition disabled:opacity-50"
          :disabled="isPlaying || isMuted"
          @click="testSound(statusData?.transaction?.amount || 100000)"
        >
          <span>{{ isPlaying ? 'Memutar...' : '🔊 Uji Suara' }}</span>
        </button>
      </div>

      <!-- Mode Suara Selector -->
      <div class="flex items-center gap-1.5 pt-1.5 border-t border-base-200">
        <span class="text-base-content/60 text-[10px] shrink-0 font-medium">Mode:</span>
        <div class="grid grid-cols-3 gap-1 w-full">
          <button
            type="button"
            class="px-2 py-1 rounded text-[10px] font-medium text-center transition"
            :class="activeVoiceMode === 'president' ? 'bg-primary text-white font-bold shadow-xs' : 'bg-base-200 text-base-content/70 hover:bg-base-300'"
            @click="setVoiceMode('president')"
          >
            👑 Presiden
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded text-[10px] font-medium text-center transition"
            :class="activeVoiceMode === 'kasual' ? 'bg-primary text-white font-bold shadow-xs' : 'bg-base-200 text-base-content/70 hover:bg-base-300'"
            @click="setVoiceMode('kasual')"
          >
            ⚡ Waww!
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded text-[10px] font-medium text-center transition"
            :class="activeVoiceMode === 'soundbox' ? 'bg-primary text-white font-bold shadow-xs' : 'bg-base-200 text-base-content/70 hover:bg-base-300'"
            @click="setVoiceMode('soundbox')"
          >
            📢 Standar
          </button>
        </div>
      </div>
    </div>

    <!-- Main Card -->
    <div class="card bg-base-100 border border-base-300 shadow-xs rounded-xl overflow-hidden">
      <!-- Status Bar -->
      <div
        class="py-2.5 px-4 text-center font-medium text-xs flex items-center justify-center gap-2 border-b"
        :class="{
          'bg-secondary/15 text-primary border-secondary/20': statusData?.status === 'PENDING' || !statusData,
          'bg-primary/10 text-primary border-primary/20 font-bold': statusData?.status === 'PAID',
          'bg-accent/10 text-accent border-accent/20': statusData?.status === 'EXPIRED' || statusData?.status === 'NOT_FOUND'
        }"
      >
        <span v-if="statusData?.status === 'PAID'" class="w-2 h-2 rounded-full bg-primary"></span>
        <span v-else-if="statusData?.status === 'EXPIRED'" class="w-2 h-2 rounded-full bg-accent"></span>
        <span v-else class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>

        <span v-if="statusData?.status === 'PAID'">Pembayaran Berhasil Terverifikasi</span>
        <span v-else-if="statusData?.status === 'EXPIRED'">QRIS Kedaluwarsa</span>
        <span v-else-if="statusData?.status === 'NOT_FOUND'">QRIS Tidak Ditemukan</span>
        <span v-else>Menunggu Pembayaran (Sisa {{ formattedTimer }})</span>
      </div>

      <div class="card-body p-4 sm:p-6 text-center space-y-4">
        <!-- SUCCESS STATE -->
        <div v-if="statusData?.status === 'PAID'" class="py-4 space-y-4">
          <div class="w-14 h-14 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center text-2xl font-black border border-primary/20">
            ✓
          </div>
          <div>
            <h2 class="text-xl font-black text-primary tracking-tight">PEMBAYARAN LUNAS</h2>
            <p class="text-xs text-base-content/70 mt-0.5">Uang masuk telah diverifikasi di mutasi GoPay.</p>
          </div>

          <!-- Transaction Summary -->
          <div v-if="statusData.transaction" class="bg-base-200/60 p-3.5 rounded-lg text-left text-xs space-y-2 border border-base-300">
            <div class="flex justify-between items-center">
              <span class="text-base-content/60">Nominal:</span>
              <span class="font-mono font-bold text-sm text-primary">Rp {{ Number(statusData.transaction.amount || 0).toLocaleString('id-ID') }}</span>
            </div>
            <div v-if="statusData.transaction.issuer" class="flex justify-between">
              <span class="text-base-content/60">Metode:</span>
              <span class="font-medium">{{ statusData.transaction.issuer }}</span>
            </div>
            <div v-if="statusData.transaction.payer_name" class="flex justify-between">
              <span class="text-base-content/60">Pengirim:</span>
              <span class="font-medium">{{ statusData.transaction.payer_name }}</span>
            </div>
            <div v-if="statusData.transaction.reference_id" class="flex justify-between">
              <span class="text-base-content/60">Ref ID:</span>
              <span class="font-mono text-[10px]">{{ statusData.transaction.reference_id }}</span>
            </div>
          </div>

          <!-- Replay Audio Button -->
          <button
            type="button"
            class="btn btn-outline btn-xs w-full gap-1.5 border-base-300 text-[11px] font-medium"
            :disabled="isPlaying"
            @click="playPaymentSuccess(statusData.transaction?.amount || 0)"
          >
            <span>🔊 Ulangi Notifikasi Suara</span>
          </button>

          <NuxtLink to="/dashboard" class="btn btn-primary btn-sm w-full min-h-[40px] text-xs font-semibold rounded-lg text-primary-content">
            Lihat di Riwayat Mutasi
          </NuxtLink>
        </div>

        <!-- EXPIRED STATE -->
        <div v-else-if="statusData?.status === 'EXPIRED' || statusData?.status === 'NOT_FOUND'" class="py-6 space-y-3">
          <div class="w-12 h-12 rounded-full bg-accent/10 text-accent mx-auto flex items-center justify-center text-xl font-bold border border-accent/20">
            !
          </div>
          <h2 class="text-base font-bold text-accent">Sesi QRIS Berakhir</h2>
          <p class="text-xs text-base-content/70">Waktu pembayaran telah habis. Silakan buat QRIS baru.</p>
          <NuxtLink to="/" class="btn btn-outline btn-sm rounded-lg text-xs mt-2">
            Buat QRIS Baru
          </NuxtLink>
        </div>

        <!-- PENDING / ACTIVE STATE -->
        <div v-else class="space-y-4">
          <!-- Merchant & Nominal Summary Banner -->
          <div
            v-if="statusData?.merchant_name || statusData?.amount"
            class="bg-base-200/60 border border-base-300 rounded-xl p-3 text-center space-y-1"
          >
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/20 text-primary text-[10px] font-bold">
              <span class="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
              <span>{{ statusData.merchant_name || 'GoPay Merchant' }}</span>
              <span v-if="statusData.merchant_city" class="text-base-content/50">({{ statusData.merchant_city }})</span>
            </div>
            <div v-if="statusData.amount" class="text-xl sm:text-2xl font-black font-mono text-primary tracking-tight">
              Rp {{ Number(statusData.amount).toLocaleString('id-ID') }}
            </div>
          </div>

          <!-- QR Code Canvas (Always crisp with high scan contrast) -->
          <div class="space-y-2">
            <div class="inline-block p-3 bg-white rounded-xl border border-slate-200 shadow-xs mx-auto">
              <img
                :src="qrImageUrl"
                alt="QRIS Pembayaran"
                class="w-56 h-56 sm:w-60 sm:h-60 mx-auto object-contain block"
              />
            </div>

            <!-- Action: Salin Kartu QR & Unduh -->
            <div class="flex items-center justify-center gap-2">
              <button
                type="button"
                class="btn btn-sm btn-outline gap-1.5 text-xs font-semibold rounded-lg border-base-300 hover:border-primary hover:bg-primary hover:text-white transition"
                :disabled="isCopyingQr"
                title="Salin kartu QRIS lengkap dengan nama toko & nominal ke clipboard"
                @click="copyQrImage"
              >
                <span v-if="isCopyingQr" class="loading loading-spinner loading-xs"></span>
                <span>{{ qrCopied ? '✓ Kartu Tersalin!' : '📋 Salin Kartu QR' }}</span>
              </button>
              <button
                type="button"
                class="btn btn-sm btn-ghost gap-1 text-xs font-medium text-base-content/70 hover:text-base-content rounded-lg"
                title="Unduh file kartu pembayaran QRIS (PNG)"
                @click="downloadQrImage"
              >
                <span>⬇️ Unduh</span>
              </button>
            </div>
          </div>

          <div class="space-y-0.5">
            <p class="text-xs font-semibold text-base-content">Scan dengan Aplikasi Apapun</p>
            <p class="text-[11px] text-base-content/60">GoPay, BCA, Mandiri, Dana, OVO, ShopeePay & M-Banking</p>
          </div>

          <!-- Actions: Check now & Toggle Polling -->
          <div class="pt-1 flex flex-col gap-2">
            <button
              class="btn btn-outline btn-sm w-full min-h-[40px] text-xs font-semibold rounded-lg border-base-300"
              :disabled="isChecking"
              @click="checkStatus"
            >
              <span v-if="isChecking" class="loading loading-spinner loading-xs"></span>
              <span>{{ isChecking ? 'Mengecek mutasi...' : 'Cek Status Pembayaran' }}</span>
            </button>

            <!-- Live Heartbeat Polling Indicator -->
            <div
              class="flex items-center justify-between text-xs px-2.5 py-2 rounded-lg border transition-all duration-300"
              :class="isPolling ? 'bg-primary/5 border-primary/20 text-base-content' : 'bg-base-200/40 border-base-200 text-base-content/50'"
            >
              <div class="flex items-center gap-2.5">
                <!-- Heartbeat Cardiac Pulse Dot -->
                <div class="relative flex items-center justify-center w-3.5 h-3.5">
                  <template v-if="isPolling">
                    <span
                      class="absolute w-3.5 h-3.5 rounded-full bg-primary/30 animate-heartbeat-ping"
                    ></span>
                    <span
                      class="relative w-2 h-2 rounded-full bg-primary animate-heartbeat"
                    ></span>
                  </template>
                  <span
                    v-else
                    class="w-2 h-2 rounded-full bg-base-content/30"
                  ></span>
                </div>

                <div class="flex flex-col text-left">
                  <div class="flex items-center gap-1 font-medium leading-tight text-[11px]">
                    <span>{{ isPolling ? 'Auto-Polling Aktif' : 'Polling Dinonaktifkan' }}</span>
                    <Activity
                      v-if="isPolling"
                      class="w-3.5 h-3.5 text-primary animate-heartbeat shrink-0 inline-block"
                    />
                  </div>
                  <span class="text-[10px] text-base-content/60 leading-tight">
                    {{ isChecking ? 'Sinkronisasi mutasi...' : 'Detak periksa tiap 3 detik' }}
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                class="toggle toggle-xs toggle-primary"
                :checked="isPolling"
                aria-label="Toggle auto polling"
                @change="togglePolling"
              />
            </div>
          </div>
        </div>

        <!-- Order ID Details with Quick Copy -->
        <div class="pt-3 border-t border-base-200 flex justify-between items-center text-[11px]">
          <span class="text-base-content/60">ID Order:</span>
          <button
            type="button"
            class="font-mono text-base-content/80 hover:text-primary flex items-center gap-1 active:scale-95 transition"
            @click="copyId"
          >
            <span>{{ qrisId }}</span>
            <span class="text-[10px] text-primary">{{ copied ? '✓ Tersalin' : '📋' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes heartbeat {
  0% {
    transform: scale(1);
    opacity: 0.9;
  }
  14% {
    transform: scale(1.3);
    opacity: 1;
  }
  28% {
    transform: scale(1);
    opacity: 0.85;
  }
  42% {
    transform: scale(1.18);
    opacity: 1;
  }
  70% {
    transform: scale(1);
    opacity: 0.9;
  }
  100% {
    transform: scale(1);
    opacity: 0.9;
  }
}

@keyframes heartbeat-ping {
  0% {
    transform: scale(0.9);
    opacity: 0.75;
  }
  28% {
    transform: scale(2);
    opacity: 0;
  }
  50% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(0.9);
    opacity: 0;
  }
}

.animate-heartbeat {
  animation: heartbeat 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
  transform-origin: center;
}

.animate-heartbeat-ping {
  animation: heartbeat-ping 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
  transform-origin: center;
}
</style>
