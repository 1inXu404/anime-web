<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getCalendar } from '@/api/bangumi'
import type { CleanCalendarDay } from '@/types/bangumi'
import BentoGrid from '@/components/BentoGrid.vue'
import AnimeCard from '@/components/AnimeCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ErrorState from '@/components/ErrorState.vue'

const calendar = ref<CleanCalendarDay[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Map JS getDay() (0=Sun,1-6=Mon-Sat) to Bangumi weekday.id (1=Mon,...7=Sun)
const todayBgmWeekday = computed(() => {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 7 : jsDay
})

const todayData = computed(() =>
  calendar.value.find((d) => d.weekday.id === todayBgmWeekday.value),
)

const otherDays = computed(() =>
  calendar.value.filter((d) => d.weekday.id !== todayBgmWeekday.value),
)

async function fetchCalendar() {
  loading.value = true
  error.value = null
  try {
    calendar.value = await getCalendar()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '获取日历数据失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchCalendar)
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero Section -->
    <header
      class="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-6 py-16 sm:px-8 sm:py-20 lg:py-24"
    >
      <!-- Animated dot-grid pattern -->
      <div class="hero-pattern absolute inset-0 opacity-[0.07]" />
      <!-- Radial glow accents -->
      <div class="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div class="absolute bottom-0 left-0 w-72 h-72 bg-indigo-300/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      <div class="relative max-w-6xl mx-auto">
        <h1
          class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.15)]"
        >
          追番日历
        </h1>
        <p class="mt-4 text-lg sm:text-xl text-white/90">
          查看每日播出动画
        </p>
        <!-- Decorative divider -->
        <div class="mt-4 w-16 h-0.5 bg-gradient-to-r from-white/60 to-transparent rounded-full" />
        <router-link
          to="/browse"
          class="mt-8 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-xl text-base font-semibold hover:bg-white/30 shadow-lg shadow-black/10 transition-all"
        >
          浏览番剧库
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </router-link>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <!-- Loading State -->
      <LoadingSpinner v-if="loading" />

      <!-- Error State -->
      <ErrorState
        v-else-if="error"
        :message="error"
        :retry="fetchCalendar"
      />

      <!-- Empty State -->
      <div
        v-else-if="calendar.length === 0 || calendar.every((d) => d.items.length === 0)"
        class="flex flex-col items-center justify-center min-h-[40vh] gap-5"
      >
        <svg
          class="w-20 h-20 text-zinc-300 dark:text-zinc-700"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
          <path d="M16 18h.01" />
        </svg>
        <p class="text-zinc-500 dark:text-zinc-400 text-sm">本周暂无动画播出</p>
      </div>

      <!-- Calendar Content -->
      <div v-else class="space-y-14">
        <!-- Today's Highlight -->
        <section v-if="todayData && todayData.items.length > 0">
          <div class="flex items-center gap-3 mb-4">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-semibold shadow-sm shadow-indigo-500/25"
            >
              今日
            </span>
            <h2 class="text-xl font-bold text-zinc-800 dark:text-zinc-200">
              {{ todayData.weekday.cn }}
            </h2>
            <span class="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full text-xs font-medium">
              {{ todayData.items.length }} 部
            </span>
          </div>
          <BentoGrid>
            <AnimeCard
              v-for="item in todayData.items"
              :key="item.id"
              :id="item.id"
              :title="item.name_cn || item.name"
              :image="item.images?.common"
              :score="item.rating?.score"
              :air-date="item.air_date"
              :rank="item.rank"
            />
          </BentoGrid>
        </section>

        <!-- Weekday Sections -->
        <section
          v-for="day in otherDays"
          :key="day.weekday.id"
        >
          <template v-if="day.items.length > 0">
            <div class="flex items-center gap-3 mb-3">
              <span class="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
              <h2 class="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                {{ day.weekday.cn }}
              </h2>
              <span class="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full text-xs font-medium">
                {{ day.items.length }} 部
              </span>
            </div>
            <BentoGrid>
              <AnimeCard
                v-for="item in day.items"
                :key="item.id"
                :id="item.id"
                :title="item.name_cn || item.name"
                :image="item.images?.common"
                :score="item.rating?.score"
                :air-date="item.air_date"
                :rank="item.rank"
              />
            </BentoGrid>
          </template>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.hero-pattern {
  background-image:
    radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0);
  background-size: 32px 32px;
  animation: pattern-drift 20s linear infinite;
}

@keyframes pattern-drift {
  from {
    transform: translate(0, 0);
  }
  to {
    transform: translate(32px, 32px);
  }
}
</style>
