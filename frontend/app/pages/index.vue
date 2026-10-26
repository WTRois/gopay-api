<script setup lang="ts">
import { ref, computed } from 'vue'

const router = useRouter()
const rawAmount = ref<number | ''>(50000)
const isLoading = ref(false)
const errorMessage = ref('')

const quickAmounts = [10000, 20000, 50000, 100000, 200000, 500000]

const formattedPreview = computed(() => {
  if (!rawAmount.value || rawAmount.value <= 0) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(rawAmount.value))
})

async function handleSubmit() {
  errorMessage.value = ''
  const amount = Number(rawAmount.value)

  if (!amount || amount < 1000) {
    errorMessage.value = 'Nominal minimal pembayaran adalah Rp 1.000'
    return
  }

  try {
    isLoading.value = true
    const res = await $fetch<{ success: boolean; data: { qris_id: string } }>('/api/create-qris', {
      method: 'POST',
      body: { amount },
    })

    if (res.success && res.data?.qris_id) {
      router.push(`/checkout/${res.data.qris_id}`)
    } else {
      errorMessage.value = 'Respon gateway backend tidak valid'
    }
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Gagal membuat QRIS dinamis'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-lg mx-auto space-y-4 sm:space-y-6">
    <!-- Header Title -->
    <div class="space-y-1">
      <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-base-content">
        Buat QRIS Dinamis
      </h1>
      <p class="text-xs sm:text-sm text-base-content/70">
        Kunci nominal otomatis ke tagar QRIS fisik toko Anda tanpa biaya admin pihak ketiga.
      </p>
    </div>

    <!-- Generator Card -->
    <div class="card bg-base-100 border border-base-300 shadow-xs rounded-xl overflow-hidden">
      <form class="card-body p-4 sm:p-6 gap-4" @submit.prevent="handleSubmit">
        <!-- Error Alert -->
        <div v-if="errorMessage" class="alert alert-error text-xs py-2 px-3 rounded-lg flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Input Nominal -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-baseline">
            <label class="text-xs font-semibold text-base-content/80">Nominal Pembayaran</label>
            <span class="text-xs font-mono font-bold text-primary">{{ formattedPreview }}</span>
          </div>

          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/50 font-bold text-sm">
              Rp
            </div>
            <input
              v-model.number="rawAmount"
              type="number"
              min="1000"
              step="100"
              placeholder="50000"
              class="input input-bordered w-full pl-10 text-base sm:text-lg font-mono font-semibold tracking-tight min-h-[46px] rounded-lg focus:border-primary"
              required
            />
          </div>
        </div>

        <!-- Quick Select Buttons (Thumb friendly) -->
        <div class="space-y-1.5">
          <span class="text-[11px] font-medium text-base-content/60">Pilihan Nominal Cepat:</span>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <button
              v-for="amt in quickAmounts"
              :key="amt"
              type="button"
              class="btn btn-sm h-9 min-h-[36px] rounded-md font-mono text-xs transition border"
              :class="rawAmount === amt ? 'btn-primary text-primary-content font-bold' : 'btn-outline border-base-300 font-normal'"
              @click="rawAmount = amt"
            >
              {{ amt >= 1000 ? `${amt / 1000}k` : amt }}
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <button
            type="submit"
            class="btn btn-primary w-full min-h-[46px] text-sm font-semibold rounded-lg shadow-xs text-primary-content"
            :disabled="isLoading || !rawAmount"
          >
            <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
            <span>{{ isLoading ? 'Memproses QRIS...' : 'Buat Kode QR & Bayar' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Feature Pillars (Anti-slop, clean minimal cards) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
      <div class="p-3 bg-base-100 rounded-lg border border-base-300 text-xs space-y-0.5">
        <span class="font-bold text-primary block">Nol Biaya Admin</span>
        <p class="text-base-content/70 text-[11px]">Uang langsung masuk ke akun GoPay fisik toko tanpa potongan perantara.</p>
      </div>
      <div class="p-3 bg-base-100 rounded-lg border border-base-300 text-xs space-y-0.5">
        <span class="font-bold text-primary block">Klaim Bersih Atomik</span>
        <p class="text-base-content/70 text-[11px]">Database SQLite menjamin satu transaksi masuk tidak bisa diklaim dua kali.</p>
      </div>
      <div class="p-3 bg-base-100 rounded-lg border border-base-300 text-xs space-y-0.5">
        <span class="font-bold text-primary block">Polling Mutasi 3s</span>
        <p class="text-base-content/70 text-[11px]">Halaman otomatis mendeteksi ketika pembeli selesai transfer di e-wallet.</p>
      </div>
    </div>
  </div>
</template>
