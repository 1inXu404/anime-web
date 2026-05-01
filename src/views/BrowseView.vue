<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getAllSubjects } from '@/api/bangumi'
import type { SubjectBrowse } from '@/types/bangumi'
import BentoGrid from '@/components/BentoGrid.vue'
import AnimeCard from '@/components/AnimeCard.vue'
import YearMonthPicker from '@/components/YearMonthPicker.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ErrorState from '@/components/ErrorState.vue'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)

const animeList = ref<SubjectBrowse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Hardcoded content filter
const isBlocked = (a: SubjectBrowse) =>
  a.tags?.some(t => t.name.includes('里番')) ||
  a.name_cn?.includes('我的英雄学院') ||
  a.name?.includes('我的英雄学院')

const filteredList = computed(() => animeList.value.filter(a => !isBlocked(a)))

async function fetchAnime() {
  loading.value = true
  error.value = null
  animeList.value = []
  try {
    animeList.value = await getAllSubjects(year.value, month.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '获取番剧数据失败'
  } finally {
    loading.value = false
  }
}

function onPickerChange(payload: { year: number; month: number }) {
  year.value = payload.year
  month.value = payload.month
}

watch([year, month], fetchAnime, { immediate: true })
</script>

<template>
  <div class="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <!-- Gradient Hero Header -->
    <header class="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 py-8 sm:py-12 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8 rounded-2xl">
      <div class="text-center">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          番剧浏览
        </h1>
        <p class="text-lg text-zinc-500 dark:text-zinc-400 mt-2">
          {{ year }}年{{ month }}月新番
        </p>
      </div>

      <!-- Year/Month Picker -->
      <div class="max-w-sm mx-auto mt-6">
        <YearMonthPicker
          :model-year="year"
          :model-month="month"
          @change="onPickerChange"
        />
      </div>
    </header>

    <!-- Loading State -->
    <LoadingSpinner v-if="loading" text="正在探索番剧宇宙..." />

    <!-- Error State -->
    <ErrorState
      v-else-if="error"
      :message="error"
      :retry="fetchAnime"
    />

    <!-- Empty State -->
    <div
      v-else-if="filteredList.length === 0"
      class="flex flex-col items-center justify-center min-h-[40vh] gap-6"
    >
      <div class="relative">
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 rounded-full blur-2xl opacity-40 scale-150" />
        <svg
          class="relative w-20 h-20 text-indigo-300 dark:text-zinc-700"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="2" />
          <path d="M7 2v20" />
          <path d="M17 2v20" />
          <path d="M2 12h20" />
          <path d="M2 7h5" />
          <path d="M2 17h5" />
          <path d="M17 7h5" />
          <path d="M17 17h5" />
        </svg>
      </div>
      <div class="text-center space-y-2">
        <p class="text-zinc-600 dark:text-zinc-400 font-medium">
          该月份暂无番剧数据
        </p>
        <p class="text-zinc-400 dark:text-zinc-500 text-sm">
          请尝试选择其他年份或月份
        </p>
      </div>
    </div>

    <!-- Results -->
    <template v-else>
      <div class="mb-6">
        <span class="inline-flex items-center px-3 py-1 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 font-medium shadow-sm">
          共 {{ filteredList.length }} 部作品
        </span>
      </div>

      <BentoGrid>
        <AnimeCard
          v-for="anime in filteredList"
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
    </template>
  </div>
</template>
