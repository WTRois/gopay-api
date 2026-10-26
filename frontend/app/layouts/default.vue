<script setup lang="ts">
import Navbar from '~/components/Navbar.vue'
import MobileBottomNav from '~/components/MobileBottomNav.vue'
import { useTheme } from '~/composables/useTheme'

const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-base-200 text-base-content antialiased transition-colors duration-200 selection:bg-primary selection:text-primary-content">
    <Navbar />

    <main class="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8">
      <slot />
    </main>

    <!-- Mobile Thumb Navigation Bar -->
    <MobileBottomNav />

    <!-- Desktop Footer -->
    <footer class="hidden md:block border-t border-base-300 py-4 text-center text-xs text-base-content/60">
      <p>GoPay Merchant QRIS Gateway &bull; Self-Hosted & Non-Custodial</p>
    </footer>
  </div>
</template>
