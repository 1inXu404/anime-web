import { ref, watchEffect } from 'vue'

const THEME_KEY = 'anime-web-theme'

// 'system' | 'light' | 'dark'
type ThemeMode = 'system' | 'light' | 'dark'

const mode = ref<ThemeMode>(
  (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system'
)

const isDark = ref(false)

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme() {
  const dark =
    mode.value === 'dark' ||
    (mode.value === 'system' && getSystemPrefersDark())
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

function toggleTheme() {
  // Cycle: system → light → dark → system
  if (mode.value === 'system') mode.value = 'light'
  else if (mode.value === 'light') mode.value = 'dark'
  else mode.value = 'system'
  localStorage.setItem(THEME_KEY, mode.value)
  applyTheme()
}

// Ensure isDark stays in sync with the DOM class on every render
watchEffect(() => {
  const dark = document.documentElement.classList.contains('dark')
  if (isDark.value !== dark) isDark.value = dark
})

// Listen for system preference changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
}

// Initial apply
applyTheme()

export function useTheme() {
  return {
    mode,
    isDark,
    toggleTheme,
  }
}
