<script setup lang="ts">
import { ref, onMounted } from "vue";

useHead({
  title: "Status Sesi Gateway",
});

interface TokenStatusResponse {
  success: boolean;
  message: string;
  merchant_id?: string;
  error?: string;
}

const status = ref<TokenStatusResponse | null>(null);
const isLoading = ref(true);
const errorMessage = ref("");

async function fetchStatus() {
  try {
    isLoading.value = true;
    errorMessage.value = "";
    const res = await $fetch<TokenStatusResponse>("/api/token-status");
    status.value = res;
  } catch (err: any) {
    errorMessage.value =
      err.data?.statusMessage || err.message || "Sesi GoPay belum aktif atau kedaluwarsa.";
    status.value = null;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchStatus();
});
</script>

<template>
  <div class="max-w-lg mx-auto space-y-4 sm:space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-base-content">Status Sesi GoPay</h1>
        <p class="text-xs text-base-content/70">Kesiapan autentikasi merchant untuk request ke server Gojek.</p>
      </div>

      <button
        class="btn btn-outline btn-sm min-h-[36px] rounded-lg border-base-300 gap-1 text-xs"
        :disabled="isLoading"
        @click="fetchStatus"
      >
        <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
        <span v-else>↻</span>
        <span>Cek</span>
      </button>
    </div>

    <!-- Main Card -->
    <div class="card bg-base-100 border border-base-300 shadow-xs rounded-xl p-4 sm:p-6 space-y-4">
      <div v-if="isLoading" class="text-center py-8">
        <span class="loading loading-spinner loading-sm"></span>
        <p class="text-xs text-base-content/60 mt-2">Mengecek sesi token...</p>
      </div>

      <!-- Active Session -->
      <div v-else-if="status?.success" class="space-y-4">
        <div class="flex items-center gap-3 p-3.5 rounded-lg bg-primary/10 border border-primary/20">
          <div class="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-sm shrink-0">
            ✓
          </div>
          <div>
            <h3 class="font-bold text-primary text-xs sm:text-sm">Sesi Login Aktif</h3>
            <p class="text-[11px] text-base-content/70">{{ status.message }}</p>
          </div>
        </div>

        <div class="divide-y divide-base-200 text-xs">
          <div class="py-2.5 flex justify-between items-center">
            <span class="text-base-content/60">Merchant ID:</span>
            <span class="font-mono font-semibold">{{ status.merchant_id || '-' }}</span>
          </div>
          <div class="py-2.5 flex justify-between items-center">
            <span class="text-base-content/60">Auto-Refresh Sesi:</span>
            <span class="text-primary font-medium">Aktif Otomatis</span>
          </div>
          <div class="py-2.5 flex justify-between items-center">
            <span class="text-base-content/60">Status Verifikasi:</span>
            <span class="badge badge-success badge-xs py-1.5 px-2 text-[10px] font-bold">SIAP SCAN QRIS</span>
          </div>
        </div>
      </div>

      <!-- Inactive / Expired Session -->
      <div v-else class="space-y-4">
        <div class="flex items-center gap-3 p-3.5 rounded-lg bg-accent/10 border border-accent/20">
          <div class="w-8 h-8 rounded-full bg-accent text-accent-content flex items-center justify-center font-bold text-sm shrink-0">
            !
          </div>
          <div>
            <h3 class="font-bold text-accent text-xs sm:text-sm">Sesi Belum Aktif / Expired</h3>
            <p class="text-[11px] text-base-content/70">{{ errorMessage }}</p>
          </div>
        </div>

        <div class="bg-base-200/50 p-3.5 rounded-lg space-y-2 text-xs border border-base-300">
          <p class="font-semibold text-base-content">Cara Login Ulang:</p>
          <ol class="list-decimal list-inside space-y-1 text-base-content/80 text-[11px] font-mono">
            <li>Buka terminal di root project <code class="bg-base-300 px-1 py-0.5 rounded">gopay-api</code></li>
            <li>Jalankan: <code class="bg-base-300 px-1 py-0.5 rounded">bun run login</code></li>
            <li>Masukkan nomor HP & OTP GoPay</li>
            <li>Setelah selesai, klik tombol "Cek" di atas</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>
