<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface TransactionItem {
  id?: string
  trans_id?: string
  amount: number
  type?: string
  description?: string
  payer_name?: string
  created_at?: string
  timestamp?: string
  status?: string
}

interface TransactionsResponse {
  success: boolean
  total_amount?: number
  data?: {
    transactions?: TransactionItem[]
  }
}

const transactions = ref<TransactionItem[]>([])
const totalAmount = ref(0)
const isLoading = ref(true)
const errorMessage = ref('')

async function fetchTransactions() {
  try {
    isLoading.value = true
    errorMessage.value = ''
    const res = await $fetch<TransactionsResponse>('/api/transactions')
    if (res.success) {
      transactions.value = res.data?.transactions || []
      totalAmount.value = res.total_amount || 0
    }
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || err.message || 'Gagal memuat transaksi'
  } finally {
    isLoading.value = false
  }
}

const totalCount = computed(() => transactions.value.length)

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0)
}

function formatDate(isoStr?: string) {
  if (!isoStr) return '-'
  try {
    return new Date(isoStr).toLocaleString('id-ID', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return isoStr
  }
}

onMounted(() => {
  fetchTransactions()
})
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-base-content">Riwayat Mutasi</h1>
        <p class="text-xs text-base-content/70">Data dana masuk akun GoPay Merchant upstream.</p>
      </div>

      <button
        class="btn btn-outline btn-sm min-h-[36px] self-start sm:self-auto gap-1.5 rounded-lg border-base-300 text-xs"
        :disabled="isLoading"
        @click="fetchTransactions"
      >
        <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
        <span v-else>↻</span>
        <span>Perbarui</span>
      </button>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMessage" class="alert alert-error text-xs py-2 px-3 rounded-lg">
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Summary Stats (2-column grid on all devices) -->
    <div class="grid grid-cols-2 gap-2.5 sm:gap-4">
      <div class="card bg-base-100 border border-base-300 shadow-xs p-3.5 sm:p-4 rounded-xl">
        <span class="text-[11px] font-medium text-base-content/60">Total Masuk</span>
        <div class="text-base sm:text-xl font-mono font-bold text-primary mt-0.5 truncate">
          {{ formatCurrency(totalAmount) }}
        </div>
      </div>
      <div class="card bg-base-100 border border-base-300 shadow-xs p-3.5 sm:p-4 rounded-xl">
        <span class="text-[11px] font-medium text-base-content/60">Total Transaksi</span>
        <div class="text-base sm:text-xl font-mono font-bold text-base-content mt-0.5">
          {{ totalCount }} <span class="text-xs font-normal text-base-content/60">mutasi</span>
        </div>
      </div>
    </div>

    <!-- TRANSACTIONS CONTAINER -->
    <div class="card bg-base-100 border border-base-300 shadow-xs rounded-xl overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-10 text-base-content/50">
        <span class="loading loading-spinner loading-sm"></span>
        <p class="text-xs mt-1.5">Memuat mutasi...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="transactions.length === 0" class="text-center py-10 px-4 text-base-content/60 text-xs">
        Belum ada mutasi transaksi yang tercatat bulan ini.
      </div>

      <div v-else>
        <!-- MOBILE VIEW (< sm): Clean List Cards -->
        <div class="divide-y divide-base-200 sm:hidden">
          <div
            v-for="trx in transactions"
            :key="trx.id || trx.trans_id || trx.timestamp"
            class="p-3.5 space-y-1.5 hover:bg-base-200/30 transition text-xs"
          >
            <div class="flex justify-between items-start gap-2">
              <span class="font-medium text-base-content line-clamp-1">
                {{ trx.payer_name || trx.description || 'GoPay Transaction' }}
              </span>
              <span class="font-mono font-bold text-primary whitespace-nowrap">
                +{{ formatCurrency(trx.amount) }}
              </span>
            </div>

            <div class="flex justify-between items-center text-[10px] text-base-content/60 font-mono">
              <span>{{ formatDate(trx.created_at || trx.timestamp) }}</span>
              <span class="badge badge-success badge-xs py-1 px-1.5 text-[9px] font-bold">SUKSES</span>
            </div>

            <div v-if="trx.trans_id || trx.id" class="text-[10px] text-base-content/50 font-mono truncate select-all">
              TRX: {{ trx.trans_id || trx.id }}
            </div>
          </div>
        </div>

        <!-- DESKTOP VIEW (>= sm): Table -->
        <div class="hidden sm:block overflow-x-auto">
          <table class="table table-sm text-xs">
            <thead class="bg-base-200/50 text-[11px] text-base-content/70">
              <tr>
                <th>Waktu</th>
                <th>Trx ID</th>
                <th>Pengirim / Keterangan</th>
                <th class="text-right">Nominal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="trx in transactions"
                :key="trx.id || trx.trans_id || trx.timestamp"
                class="hover:bg-base-200/30 border-b border-base-200/50"
              >
                <td class="font-mono text-[11px] text-base-content/70 whitespace-nowrap">
                  {{ formatDate(trx.created_at || trx.timestamp) }}
                </td>
                <td class="font-mono text-[11px] select-all">
                  {{ trx.trans_id || trx.id || '-' }}
                </td>
                <td class="font-medium text-base-content">
                  {{ trx.payer_name || trx.description || 'GoPay Transaction' }}
                </td>
                <td class="text-right font-mono font-bold text-primary whitespace-nowrap">
                  +{{ formatCurrency(trx.amount) }}
                </td>
                <td>
                  <span class="badge badge-success badge-xs py-1.5 px-2 text-[10px] font-semibold">
                    SUKSES
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
