<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getHistorySubjects } from '@/api/bangumi'
import type { SubjectBrowse } from '@/types/bangumi'
import BentoGrid from '@/components/BentoGrid.vue'
import AnimeCard from '@/components/AnimeCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ErrorState from '@/components/ErrorState.vue'

const today = new Date()
const month = today.getMonth() + 1
const monthLabel = `${month}月${today.getDate()}日`

const history = ref<Record<number, SubjectBrowse[]>>({})
const loading = ref(true)
const error = ref<string | null>(null)

const years = computed(() =>
  Object.keys(history.value)
    .map(Number)
    .sort((a, b) => b - a)
)

async function fetchHistory() {
  loading.value = true
  error.value = null
  try {
    history.value = await getHistorySubjects(month)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '获取历史数据失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchHistory)
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero -->
    <header class="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-6 py-14 sm:px-8 sm:py-18">
      <div class="absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 28px 28px;" />
      <div class="relative max-w-6xl mx-auto">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.15)]">
          历史上的今天
        </h1>
        <p class="mt-3 text-lg sm:text-xl text-white/85">
          {{ monthLabel }} · 往年今日播出的番剧
        </p>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <LoadingSpinner v-if="loading" text="正在加载历史数据..." />

      <ErrorState v-else-if="error" :message="error" :retry="fetchHistory" />

      <div v-else-if="years.length === 0" class="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p class="text-zinc-500 dark:text-zinc-400">暂无历史数据</p>
      </div>

      <div v-else class="space-y-12">
        <section v-for="year in years" :key="year">
          <div class="flex items-center gap-3 mb-4">
            <span class="w-1 h-6 rounded-full bg-gradient-to-b from-amber-500 to-rose-500" />
            <h2 class="text-xl font-bold text-zinc-800 dark:text-zinc-200">{{ year }} 年</h2>
            <span class="bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs font-medium">
              {{ history[year]?.length || 0 }} 部
            </span>
          </div>
          <BentoGrid v-if="history[year]?.length">
            <AnimeCard
              v-for="anime in history[year]"
              :key="anime.id"
              :id="anime.id"
              :title="anime.name_cn || anime.name"
              :image="anime.images?.common"
              :score="anime.rating?.score"
              :air-date="anime.date"
              :rank="anime.rating?.rank"
              :episodes="anime.eps"
            />
          </BentoGrid>
          <p v-else class="text-sm text-zinc-400 dark:text-zinc-500">暂无数据</p>
        </section>
      </div>
    </main>
  </div>
</template>
