<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const currentRouteName = computed(() => route.name as string)
const searchQuery = ref('')
const totalSubjects = ref<number | null>(null)

onMounted(async () => {
  try {
    const BASE = import.meta.env.BASE_URL
    const res = await fetch(`${BASE}data/stats.json`)
    if (res.ok) {
      const data = await res.json()
      totalSubjects.value = data.totalSubjects
    }
  } catch {}
})

function doSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  router.push({ name: 'search', query: { q } })
  searchQuery.value = ''
  closeMobileMenu()
}

const mobileMenuOpen = ref(false)

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

const navLinks = [
  { name: 'home', label: '追番日历', to: '/' },
  { name: 'browse', label: '番剧浏览', to: '/browse' },
  { name: 'history', label: '历史上的今天', to: '/history' },
  { name: 'random', label: '今日看啥', to: '/random' },
]
</script>

<template>
  <div class="relative flex min-h-screen flex-col">
    <!-- Gradient background -->
    <div class="fixed inset-0 -z-20 bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-200 dark:from-indigo-950 dark:via-purple-950 dark:to-zinc-900" />
    <!-- Softening mask overlay -->
    <div class="fixed inset-0 -z-10 bg-white/50 dark:bg-black/40" />
    <!-- Sticky Navigation Bar -->
    <header class="sticky top-0 z-50 border-b-0 bg-white/70 backdrop-blur-xl shadow-sm dark:bg-zinc-900/70 dark:shadow-zinc-950/30">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <!-- Brand -->
        <RouterLink to="/" class="py-4 text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent" @click="closeMobileMenu">
          追番
        </RouterLink>

        <!-- Desktop Navigation Links -->
        <div class="hidden items-center gap-1 sm:flex">
          <RouterLink
            v-for="link in navLinks"
            :key="link.name"
            :to="link.to"
            class="rounded-lg px-3 py-2 text-sm transition-all duration-200"
            :class="currentRouteName === link.name ? 'bg-indigo-50 text-indigo-600 font-semibold dark:bg-indigo-950 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800'"
          >
            {{ link.label }}
          </RouterLink>
        </div>

        <!-- Search -->
        <form class="hidden sm:flex items-center" @submit.prevent="doSearch">
          <div class="relative">
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="searchQuery" type="text" placeholder="搜索番剧..."
              class="w-40 pl-8 pr-3 py-1.5 rounded-lg text-sm border border-zinc-200 bg-zinc-50 text-zinc-700 placeholder-zinc-400 outline-none focus:w-56 focus:border-indigo-300 focus:bg-white transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-500 dark:focus:bg-zinc-700 dark:focus:border-indigo-500 dark:focus:text-zinc-100"
            />
          </div>
        </form>

        <!-- Theme Toggle -->
        <button
          class="inline-flex items-center justify-center rounded-lg p-2 text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          @click="toggleTheme"
          aria-label="切换主题"
          title="切换深色/浅色模式"
        >
          <!-- Sun icon (shown in dark mode) -->
          <svg v-if="isDark" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <!-- Moon icon (shown in light mode) -->
          <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>

        <!-- Mobile Hamburger Button -->
        <button
          class="inline-flex items-center justify-center rounded-lg p-2 text-zinc-500 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-zinc-800 sm:hidden"
          type="button"
          :aria-expanded="mobileMenuOpen"
          aria-label="切换导航菜单"
          @click="toggleMobileMenu"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              v-if="!mobileMenuOpen"
              fill-rule="evenodd"
              d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
              clip-rule="evenodd"
            />
            <path
              v-else
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </nav>

      <!-- Gradient accent bar -->
      <div class="h-px bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30"></div>

      <!-- Mobile Dropdown Menu -->
      <Transition name="mobile-menu">
        <div
          v-if="mobileMenuOpen"
          class="border-t border-indigo-100/50 bg-white/90 backdrop-blur-xl dark:bg-zinc-900/90 dark:border-zinc-700/50 sm:hidden"
        >
          <div class="mx-auto max-w-7xl space-y-1 px-4 pb-4 pt-2">
            <form class="mb-2" @submit.prevent="doSearch">
              <input v-model="searchQuery" type="text" placeholder="搜索番剧..."
                class="w-full px-3 py-2 rounded-lg text-sm border border-zinc-200 bg-zinc-50 text-zinc-700 placeholder-zinc-400 outline-none focus:border-indigo-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:placeholder-zinc-500 dark:focus:bg-zinc-700 dark:focus:text-zinc-100"
              />
            </form>
            <RouterLink
              v-for="link in navLinks"
              :key="link.name"
              :to="link.to"
              class="block rounded-lg px-3 py-2.5 text-sm transition-all duration-200"
              :class="currentRouteName === link.name ? 'bg-indigo-50 text-indigo-600 font-semibold dark:bg-indigo-950 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800'"
              @click="closeMobileMenu"
            >
              {{ link.label }}
            </RouterLink>
          </div>
        </div>
      </Transition>
    </header>

    <!-- Main Content with Page Transitions -->
    <main class="flex-1">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <!-- Footer -->
    <div class="h-px bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200"></div>
    <footer class="bg-white/50 backdrop-blur-sm py-10 text-center text-sm text-zinc-400 dark:bg-zinc-900/50 dark:text-zinc-500">
      <p v-if="totalSubjects" class="mb-2 text-zinc-500 dark:text-zinc-400">
        已收录 <span class="font-semibold text-indigo-500 dark:text-indigo-400">{{ totalSubjects.toLocaleString() }}</span> 部作品信息
      </p>
      数据来源:
      <a
        href="https://bgm.tv"
        target="_blank"
        rel="noopener noreferrer"
        class="text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition-all duration-200 hover:text-indigo-500 hover:decoration-indigo-400 dark:text-zinc-400"
      >
        Bangumi
      </a>
      <span class="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
      <a
        href="https://github.com/1inXu404/anime-web"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition-all duration-200 hover:text-indigo-500 hover:decoration-indigo-400 dark:text-zinc-400"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>
        项目主页
      </a>
    </footer>
  </div>
</template>

<style scoped>
/* Mobile menu slide transition */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
