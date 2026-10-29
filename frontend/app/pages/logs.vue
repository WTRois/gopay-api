<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

useHead({
  title: "Log Aktivitas Gateway",
});

interface LogItem {
  id: number;
  timestamp: string;
  type: "INFO" | "SUCCESS" | "ERROR" | "WARN" | string;
  message: string;
  details?: any;
}

const logs = ref<LogItem[]>([]);
const selectedFilter = ref("ALL");
const isLoading = ref(true);

async function fetchLogs() {
  try {
    isLoading.value = true;
    const res = await $fetch<{ success: boolean; logs: LogItem[] }>("/api/logs");
    if (res.success) {
      logs.value = res.logs || [];
    }
  } catch (err) {
    console.error("Failed to load logs", err);
  } finally {
    isLoading.value = false;
  }
}

const filteredLogs = computed(() => {
  if (selectedFilter.value === "ALL") return logs.value;
  return logs.value.filter((l) => l.type === selectedFilter.value);
});

function formatTime(isoStr: string) {
  try {
    return new Date(isoStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

onMounted(() => {
  fetchLogs();
});
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Header & Filter Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-base-content">Log Aktivitas</h1>
        <p class="text-xs text-base-content/70">Aktivitas gateway, polling QRIS, dan token sesi.</p>
      </div>

      <div class="flex items-center gap-2">
        <select v-model="selectedFilter" class="select select-bordered select-sm min-h-[36px] rounded-lg text-xs flex-1 sm:flex-none">
          <option value="ALL">Semua Level</option>
          <option value="INFO">INFO</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="ERROR">ERROR</option>
        </select>

        <button
          class="btn btn-outline btn-sm min-h-[36px] rounded-lg border-base-300 gap-1 text-xs"
          :disabled="isLoading"
          @click="fetchLogs"
        >
          <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
          <span v-else>↻</span>
          <span>Perbarui</span>
        </button>
      </div>
    </div>

    <!-- Logs Container -->
    <div class="card bg-base-100 border border-base-300 shadow-xs rounded-xl overflow-hidden">
      <div class="p-2.5 sm:p-3 bg-base-200/50 border-b border-base-300 flex justify-between items-center text-[11px]">
        <span class="font-mono text-base-content/70">
          {{ filteredLogs.length }} entri log
        </span>
        <span class="text-base-content/50">Maks 200 riwayat</span>
      </div>

      <div class="overflow-y-auto max-h-[600px] divide-y divide-base-200/50">
        <div v-if="isLoading" class="text-center py-10 text-base-content/50 text-xs">
          <span class="loading loading-spinner loading-sm"></span>
          <p class="mt-1.5">Memuat entri log...</p>
        </div>

        <div v-else-if="filteredLogs.length === 0" class="text-center py-10 text-base-content/50 text-xs">
          Tidak ada entri log dengan filter ini.
        </div>

        <div
          v-for="log in filteredLogs"
          :key="log.id || log.timestamp"
          class="p-2.5 sm:p-3 text-xs space-y-1 hover:bg-base-200/30 transition"
        >
          <div class="flex items-center justify-between text-[10px] font-mono">
            <span class="text-base-content/50">{{ formatTime(log.timestamp) }}</span>
            <span
              class="badge badge-xs text-[9px] font-bold py-1 px-1.5 rounded-sm"
              :class="{
                'badge-info text-info-content': log.type === 'INFO',
                'badge-success text-success-content': log.type === 'SUCCESS',
                'badge-error text-error-content': log.type === 'ERROR',
                'badge-warning text-warning-content': log.type === 'WARN'
              }"
            >
              {{ log.type }}
            </span>
          </div>

          <p class="text-base-content/90 font-mono text-[11px] leading-relaxed break-words">
            {{ log.message }}
          </p>

          <pre v-if="log.details" class="p-2 bg-base-200/60 rounded text-[10px] text-base-content/70 overflow-x-auto font-mono mt-1 border border-base-300">{{ JSON.stringify(log.details, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
