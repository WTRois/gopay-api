<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTheme } from '~/composables/useTheme'

const { currentTheme, toggleTheme } = useTheme()

const health = ref<{ status?: string; success?: boolean; uptime?: number } | null>(null)
const isChecking = ref(false)

const isOnline = computed(() => {
  return health.value?.status?.toUpperCase() === 'OK' || health.value?.success === true
})

async function checkHealth() {
  try {
    isChecking.value = true
    const res = await $fetch<{ status?: string; success?: boolean; uptime?: number }>('/api/health')
    health.value = res
  } catch {
    health.value = { status: 'down' }
  } finally {
    isChecking.value = false
  }
}

onMounted(() => {
  checkHealth()
  setInterval(checkHealth, 30000)
})
</script>

<template>
  <header class="border-b border-base-300 bg-base-100/90 sticky top-0 z-30 backdrop-blur-md">
    <div class="max-w-5xl mx-auto navbar min-h-[56px] px-3 sm:px-6 flex justify-between items-center">
      <!-- Left: Brand + Status -->
      <div class="flex items-center gap-2 sm:gap-3">
        <NuxtLink to="/" class="flex items-center gap-2 font-bold text-base sm:text-lg tracking-tight hover:opacity-90">
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-primary text-primary-content flex items-center justify-center font-black text-xs sm:text-sm shadow-xs">
            G
          </div>
          <span class="text-base-content font-bold">GoPay <span class="text-primary font-semibold">Gateway</span></span>
        </NuxtLink>

        <!-- Status Indicator Pill -->
        <div
          class="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] font-medium border transition-colors"
          :class="isOnline ? 'bg-primary/10 text-primary border-primary/30' : 'bg-accent/10 text-accent border-accent/30'"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="isOnline ? 'bg-primary animate-pulse' : 'bg-accent'"></span>
          <span class="hidden xs:inline">{{ isOnline ? 'Online' : 'Offline' }}</span>
        </div>
      </div>

      <!-- Center: Desktop Navigation -->
      <nav class="hidden md:flex items-center gap-1">
        <NuxtLink
          to="/"
          class="px-3 py-1.5 rounded-md text-xs font-semibold transition hover:bg-base-200"
          active-class="bg-base-200 text-primary"
        >
          Buat QRIS
        </NuxtLink>
        <NuxtLink
          to="/dashboard"
          class="px-3 py-1.5 rounded-md text-xs font-semibold transition hover:bg-base-200"
          active-class="bg-base-200 text-primary"
        >
          Riwayat Mutasi
        </NuxtLink>
        <NuxtLink
          to="/status"
          class="px-3 py-1.5 rounded-md text-xs font-semibold transition hover:bg-base-200"
          active-class="bg-base-200 text-primary"
        >
          Sesi & Token
        </NuxtLink>
        <NuxtLink
          to="/logs"
          class="px-3 py-1.5 rounded-md text-xs font-semibold transition hover:bg-base-200"
          active-class="bg-base-200 text-primary"
        >
          Log Aktivitas
        </NuxtLink>
      </nav>

      <!-- Right: Theme Toggle & Quick Info -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- Theme Toggle Button -->
        <button
          type="button"
          class="btn btn-ghost btn-circle btn-sm w-9 h-9 min-h-[36px] text-base-content hover:bg-base-200"
          :title="currentTheme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'"
          aria-label="Toggle Theme"
          @click="toggleTheme"
        >
          <!-- Sun Icon (if dark) -->
          <svg v-if="currentTheme === 'dark'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <!-- Moon Icon (if light) -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>

        <a
          href="http://localhost:3000/health"
          target="_blank"
          class="btn btn-outline btn-xs h-7 min-h-[28px] hidden lg:inline-flex text-[11px] font-mono border-base-300"
        >
          :3000
        </a>
      </div>
    </div>
  </header>
</template>
