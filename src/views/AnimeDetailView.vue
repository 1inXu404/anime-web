<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSubject, getAllEpisodes } from '@/api/bangumi'
import type { Subject, DisplayEpisode } from '@/types/bangumi'
import EpisodeList from '@/components/EpisodeList.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ErrorState from '@/components/ErrorState.vue'

const props = defineProps<{
  id: number
}>()

const subject = ref<Subject | null>(null)
const episodes = ref<DisplayEpisode[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const summaryExpanded = ref(false)

const cleanSummary = computed(() => {
  if (!subject.value?.summary) return ''
  return subject.value.summary.replace(/<[^>]*>/g, '')
})

const summaryIsLong = computed(() => cleanSummary.value.length > 200)

const displaySummary = computed(() => {
  if (!summaryIsLong.value || summaryExpanded.value) {
    return cleanSummary.value
  }
  return cleanSummary.value.slice(0, 200) + '...'
})

const coverImage = computed(() => {
  if (!subject.value?.images) return ''
  return subject.value.images.large || subject.value.images.common
})

const tagList = computed(() => {
  if (!subject.value?.tags?.length) return ''
  return subject.value.tags
    .slice(0, 6)
    .map((t) => t.name)
    .join('、')
})

const episodeCount = computed(() => {
  if (!subject.value) return 0
  return subject.value.total_episodes || subject.value.eps || episodes.value.length
})

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [s, ep] = await Promise.all([
      getSubject(props.id),
      getAllEpisodes(props.id),
    ])
    subject.value = s
    episodes.value = ep
  } catch (e) {
    error.value = e instanceof Error ? e.message : '获取动画详情失败'
  } finally {
    loading.value = false
  }
}

function toggleSummary() {
  summaryExpanded.value = !summaryExpanded.value
}

const router = useRouter()

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="min-h-screen bg-transparent">
    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Back Button -->
      <button
        @click="goBack"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-zinc-200 text-zinc-600 hover:text-indigo-600 hover:border-indigo-200 dark:bg-zinc-900/80 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-indigo-400 dark:hover:border-indigo-800 transition-all mb-8 shadow-sm"
      >
        <svg
          class="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span class="text-sm">返回</span>
      </button>

      <!-- Loading State -->
      <LoadingSpinner v-if="loading" />

      <!-- Error State -->
      <ErrorState
        v-else-if="error"
        :message="error"
        :retry="fetchData"
      />

      <!-- Content -->
      <div v-else-if="subject" class="space-y-10">
        <!-- Hero Section -->
        <section class="glass rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row gap-6 sm:gap-8">
          <!-- Cover Image -->
          <div class="flex-shrink-0">
            <img
              v-if="coverImage"
              :src="coverImage"
              :alt="subject.name_cn || subject.name"
              class="w-48 sm:w-56 rounded-2xl shadow-2xl shadow-indigo-200/30 dark:shadow-indigo-900/20 ring-4 ring-white/80 dark:ring-zinc-800 aspect-[3/4] object-cover"
            />
            <div
              v-else
              class="w-48 sm:w-56 rounded-2xl shadow-2xl shadow-indigo-200/30 dark:shadow-indigo-900/20 ring-4 ring-white/80 dark:ring-zinc-800 aspect-[3/4] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
            >
              <svg
                class="w-12 h-12 text-zinc-300 dark:text-zinc-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          </div>

          <!-- Title & Metadata -->
          <div class="flex-1 min-w-0">
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gradient-primary leading-tight">
              {{ subject.name_cn || subject.name }}
            </h1>
            <p
              v-if="subject.name_cn && subject.name"
              class="mt-1 text-base text-zinc-400 dark:text-zinc-500 font-medium"
            >
              {{ subject.name }}
            </p>

            <!-- Metadata Grid -->
            <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-if="subject.rating?.score" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/50 border border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-700">
                <span class="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider w-16 flex-shrink-0">评分</span>
                <span class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  <span class="text-amber-500">★</span>
                  {{ subject.rating.score }}
                  <span class="text-zinc-400 dark:text-zinc-500">({{ subject.rating.total }}人评分)</span>
                </span>
              </div>

              <div v-if="subject.rating?.rank" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/50 border border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-700">
                <span class="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider w-16 flex-shrink-0">排名</span>
                <span class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 font-mono">#{{ subject.rating.rank }}</span>
              </div>

              <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/50 border border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-700">
                <span class="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider w-16 flex-shrink-0">话数</span>
                <span class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{{ episodeCount }} 话</span>
              </div>

              <div v-if="subject.date" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/50 border border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-700">
                <span class="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider w-16 flex-shrink-0">放送日期</span>
                <span class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">{{ subject.date }}</span>
              </div>

              <div v-if="tagList" class="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/50 border border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-700 sm:col-span-2">
                <span class="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider w-16 flex-shrink-0">标签</span>
                <span class="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{{ tagList }}</span>
              </div>
            </div>

            <!-- Collection Stats -->
            <div
              v-if="subject.collection"
              class="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 mt-5 rounded-xl bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/50 dark:to-purple-950/50 border border-indigo-100/50 dark:border-indigo-900/50"
            >
              <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">想看 {{ subject.collection.wish }}</span>
              <span class="text-zinc-300 dark:text-zinc-600">·</span>
              <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">在看 {{ subject.collection.doing }}</span>
              <span class="text-zinc-300 dark:text-zinc-600">·</span>
              <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">看过 {{ subject.collection.collect }}</span>
              <span class="text-zinc-300 dark:text-zinc-600">·</span>
              <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">搁置 {{ subject.collection.on_hold }}</span>
              <span class="text-zinc-300 dark:text-zinc-600">·</span>
              <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">抛弃 {{ subject.collection.dropped }}</span>
            </div>
          </div>
        </section>

        <!-- Summary Section -->
        <section v-if="cleanSummary">
          <h2 class="text-xl font-bold text-zinc-800 dark:text-zinc-200 border-b-2 border-indigo-200 dark:border-indigo-800 pb-2 mb-4 inline-block">简介</h2>
          <p class="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
            {{ displaySummary }}
          </p>
          <button
            v-if="summaryIsLong"
            class="mt-3 text-sm text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition"
            @click="toggleSummary"
          >
            {{ summaryExpanded ? '收起' : '展开' }}
          </button>
        </section>

        <!-- Episode Section -->
        <section>
          <div class="flex items-center gap-2 mb-4">
            <h2 class="text-xl font-bold text-zinc-800 dark:text-zinc-200 border-b-2 border-indigo-200 dark:border-indigo-800 pb-2 inline-block">剧集列表</h2>
            <span
              v-if="episodes.length > 0"
              class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 text-xs font-medium"
            >
              {{ episodes.length }} 话
            </span>
          </div>
          <EpisodeList :episodes="episodes" />
        </section>
      </div>
    </main>
  </div>
</template>
