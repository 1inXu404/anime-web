<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { searchSubjects } from '@/api/bangumi'
import type { SubjectBrowse } from '@/types/bangumi'
import BentoGrid from '@/components/BentoGrid.vue'
import AnimeCard from '@/components/AnimeCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ErrorState from '@/components/ErrorState.vue'

const route = useRoute()
const keyword = ref((route.query.q as string) || '')
const results = ref<SubjectBrowse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searched = ref(false)

const isBlocked = (a: SubjectBrowse) =>
  a.tags?.some(t => t.name.includes('里番')) ||
  a.name_cn?.includes('我的英雄学院') ||
  a.name?.includes('我的英雄学院')

async function doSearch() {
  const q = keyword.value.trim()
  if (!q) return
  loading.value = true
  error.value = null
  searched.value = true
  try {
    const data = await searchSubjects(q)
    results.value = (data.data || []).filter(a => !isBlocked(a))
  } catch (e) {
    error.value = e instanceof Error ? e.message : '搜索失败'
  } finally {
    loading.value = false
  }
}

watch(() => route.query.q, (val) => {
  if (val) { keyword.value = val as string; doSearch() }
})

onMounted(() => { if (route.query.q) doSearch() })
</script>

<template>
  <div class="min-h-screen">
    <header class="bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 px-4 py-8 sm:px-8 sm:py-16">
      <div class="max-w-2xl mx-auto">
        <h1 class="text-2xl sm:text-4xl font-extrabold text-white text-center tracking-tight">搜索番剧</h1>
        <form class="mt-4 sm:mt-6 flex gap-2" @submit.prevent="doSearch">
          <input
            v-model="keyword"
            type="text"
            placeholder="输入番剧名称..."
            class="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm sm:text-base placeholder-white/50 outline-none focus:bg-white/30 transition"
          />
          <button
            type="submit"
            class="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-white text-indigo-600 font-semibold text-sm sm:text-base hover:bg-white/90 transition shadow-lg shrink-0"
          >
            搜索
          </button>
        </form>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <!-- Initial state -->
      <div v-if="!searched && !loading" class="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-center">
        <svg class="w-16 h-16 text-zinc-300 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <p class="text-zinc-400 dark:text-zinc-500 text-sm">输入番剧名称开始搜索</p>
      </div>

      <LoadingSpinner v-if="loading" text="搜索中..." />

      <ErrorState v-else-if="error" :message="error" />

      <div v-else-if="searched && results.length === 0" class="flex flex-col items-center justify-center min-h-[30vh] gap-3">
        <svg class="w-14 h-14 text-zinc-300 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        <p class="text-zinc-500 dark:text-zinc-400">未找到相关番剧</p>
        <p class="text-zinc-400 dark:text-zinc-500 text-xs">尝试更换关键词</p>
      </div>
      <div v-else-if="results.length > 0">
        <p class="text-sm text-zinc-400 dark:text-zinc-500 mb-4">共 {{ results.length }} 个结果</p>
        <BentoGrid>
          <AnimeCard
            v-for="anime in results"
            :key="anime.id"
            :id="anime.id"
            :title="anime.name_cn || anime.name"
            :image="anime.images?.common"
            :score="anime.rating?.score"
            :air-date="anime.date"
            :episodes="anime.eps"
          />
        </BentoGrid>
      </div>
    </main>
  </div>
</template>
