import { ref, onMounted } from 'vue'

export function useTheme() {
  const currentTheme = ref<'light' | 'dark'>('dark')

  function setTheme(theme: 'light' | 'dark') {
    currentTheme.value = theme
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('gopay_theme', theme)
    }
  }

  function toggleTheme() {
    setTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
  }

  function initTheme() {
    if (import.meta.client) {
      const saved = localStorage.getItem('gopay_theme') as 'light' | 'dark' | null
      if (saved && (saved === 'light' || saved === 'dark')) {
        setTheme(saved)
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setTheme(prefersDark ? 'dark' : 'light')
      }
    }
  }

  onMounted(() => {
    initTheme()
  })

  return {
    currentTheme,
    toggleTheme,
    setTheme,
    initTheme,
  }
}
