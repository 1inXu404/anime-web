<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    id: number
    title: string
    subtitle?: string
    image?: string
    score?: number
    episodes?: number
    airDate?: string
    rank?: number
  }>(),
  {
    subtitle: undefined,
    image: undefined,
    score: undefined,
    episodes: undefined,
    airDate: undefined,
    rank: undefined,
  },
)

const placeholderBg = computed(() => {
  const colors = [
    'bg-gradient-to-br from-rose-400 to-rose-500',
    'bg-gradient-to-br from-amber-400 to-amber-500',
    'bg-gradient-to-br from-emerald-400 to-emerald-500',
    'bg-gradient-to-br from-sky-400 to-sky-500',
    'bg-gradient-to-br from-violet-400 to-violet-500',
    'bg-gradient-to-br from-pink-400 to-pink-500',
    'bg-gradient-to-br from-teal-400 to-teal-500',
    'bg-gradient-to-br from-orange-400 to-orange-500',
  ]
  const index = props.title.charCodeAt(0) % colors.length
  return colors[index]
})

const initial = computed(() => props.title.charAt(0).toUpperCase())

const formattedDate = computed(() => {
  if (!props.airDate) return null
  try {
    const date = new Date(props.airDate)
    if (isNaN(date.getTime())) return props.airDate
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  } catch {
    return props.airDate
  }
})
</script>

<template>
  <router-link
    :to="`/anime/${id}`"
    class="block rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 transition-all duration-300 group shadow-md shadow-zinc-200/50 dark:shadow-zinc-950/50 hover:shadow-xl hover:shadow-indigo-100/30 dark:hover:shadow-zinc-950/60 hover:-translate-y-1 hover:ring-1 hover:ring-indigo-100 dark:hover:ring-zinc-700"
  >
    <!-- Image Section -->
    <div class="relative aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
      <img
        v-if="image"
        :src="image"
        :alt="title"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center"
        :class="placeholderBg"
      >
        <span class="text-white text-4xl font-bold select-none">{{ initial }}</span>
      </div>

      <!-- Gradient Overlay -->
      <div
        class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
      />

      <!-- Score Badge -->
      <div
        v-if="score"
        class="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-[0_0_12px_rgba(250,204,21,0.25)]"
      >
        <span>&#9733;</span>
        <span>{{ score.toFixed(1) }}</span>
      </div>

      <!-- Rank Badge -->
      <div
        v-if="rank"
        class="absolute top-2 left-2 bg-gradient-to-br from-rose-500 to-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm shadow-rose-200"
      >
        #{{ rank }}
      </div>
    </div>

    <!-- Info Section -->
    <div class="p-3 dark:bg-zinc-900">
      <p class="font-bold text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-snug">{{ title }}</p>
      <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500 mt-1">
        <span v-if="episodes">{{ episodes }} 集</span>
        <span v-if="episodes && formattedDate">·</span>
        <span v-if="formattedDate">{{ formattedDate }}</span>
      </div>
    </div>
  </router-link>
</template>
