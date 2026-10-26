<template>
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-100/95 backdrop-blur-md border-t border-base-300 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
    <div class="grid grid-cols-4 items-center text-center">
      <!-- 1. Buat QRIS -->
      <NuxtLink
        to="/"
        class="flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors group"
        active-class="text-primary font-bold"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="text-[10px] tracking-tight">QRIS</span>
      </NuxtLink>

      <!-- 2. Riwayat Mutasi -->
      <NuxtLink
        to="/dashboard"
        class="flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors group text-base-content/70"
        active-class="!text-primary font-bold"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span class="text-[10px] tracking-tight">Mutasi</span>
      </NuxtLink>

      <!-- 3. Status Token -->
      <NuxtLink
        to="/status"
        class="flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors group text-base-content/70"
        active-class="!text-primary font-bold"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        <span class="text-[10px] tracking-tight">Sesi</span>
      </NuxtLink>

      <!-- 4. Log Aktivitas -->
      <NuxtLink
        to="/logs"
        class="flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors group text-base-content/70"
        active-class="!text-primary font-bold"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-[10px] tracking-tight">Logs</span>
      </NuxtLink>
    </div>
  </nav>
</template>
