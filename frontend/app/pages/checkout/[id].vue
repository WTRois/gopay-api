<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const route = useRoute()
const qrisId = route.params.id as string

interface StatusResponse {
  success: boolean
  paid?: boolean
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'NOT_FOUND'
  message?: string
  transaction?: {
    amount?: number
    issuer?: string
    payer_name?: string
    timestamp?: string
    reference_id?: string
    [key: string]: any
  }
}

const statusData = ref<StatusResponse | null>(null)
const isPolling = ref(true)
const isChecking = ref(false)
const remainingSeconds = ref(300)
const copied = ref(false)

let pollInterval: ReturnType<typeof setInterval> | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null

const formattedTimer = computed(() => {
  const m = Math.floor(remainingSeconds.value / 60)
  const s = remainingSeconds.value % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
})

const qrImageUrl = computed(() => `/api/qr-image/${qrisId}`)
const nativeCheckoutUrl = computed(() => `http://localhost:3000/qr/${qrisId}`)

async function checkStatus() {
  if (statusData.value?.status === 'PAID' || statusData.value?.status === 'EXPIRED') return

  try {
    isChecking.value = true
    const res = await $fetch<StatusResponse>(`/api/qr-status/${qrisId}`)
    statusData.value = res

    if (res.status === 'PAID' || res.status === 'EXPIRED' || res.status === 'NOT_FOUND') {
      stopPolling()
    }
  } catch (err) {
    console.error('Polling error:', err)
  } finally {
    isChecking.value = false
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval)
  pollInterval = setInterval(checkStatus, 3000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

function togglePolling() {
  isPolling.value = !isPolling.value
  if (isPolling.value) {
    startPolling()
  } else {
    stopPolling()
  }
}

function copyId() {
  if (navigator?.clipboard) {
    navigator.clipboard.writeText(qrisId)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

onMounted(() => {
  checkStatus()
  startPolling()

  timerInterval = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value -= 1
    } else {
      if (statusData.value?.status === 'PENDING') {
        checkStatus()
      }
    }
  }, 1000)
})

onUnmounted(() => {
  stopPolling()
  if (timerInterval) clearInterval(timerInterval)
})
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
          <!-- QR Code Canvas (Always crisp with high scan contrast) -->
          <div class="inline-block p-3 bg-white rounded-xl border border-slate-200 shadow-xs mx-auto">
            <img
              :src="qrImageUrl"
              alt="QRIS Pembayaran"
              class="w-56 h-56 sm:w-60 sm:h-60 mx-auto object-contain block"
            />
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

            <div class="flex items-center justify-between text-[11px] text-base-content/60 px-1 py-1">
              <span>Auto-polling (setiap 3 detik)</span>
              <input
                type="checkbox"
                class="toggle toggle-xs toggle-primary"
                :checked="isPolling"
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
