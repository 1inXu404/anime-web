<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getHistorySubjects } from '@/api/bangumi'
import type { Subject } from '@/types/bangumi'
import BentoGrid from '@/components/BentoGrid.vue'
import AnimeCard from '@/components/AnimeCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ErrorState from '@/components/ErrorState.vue'

const today = new Date()
const monthLabel = `${today.getMonth() + 1}月${today.getDate()}日`

const history = ref<Subject[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function fetchHistory() {
  loading.value = true
  error.value = null
  try {
    history.value = await getHistorySubjects()
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

      <div v-else-if="history.length === 0" class="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p class="text-zinc-500 dark:text-zinc-400">暂无历史数据</p>
      </div>

      <div v-else>
        <div class="flex items-center gap-3 mb-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-semibold shadow-sm">
            共 {{ history.length }} 部
          </span>
        </div>
        <BentoGrid>
          <AnimeCard
            v-for="anime in history"
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
      </div>
    </main>
  </div>
</template>
