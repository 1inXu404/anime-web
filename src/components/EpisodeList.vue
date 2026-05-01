<script setup lang="ts">
import type { DisplayEpisode } from '@/types/bangumi'

defineProps<{
  episodes: DisplayEpisode[]
}>()
</script>

<template>
  <div class="rounded-xl bg-white border border-zinc-200 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
    <!-- Header -->
    <div class="grid grid-cols-[3rem_1fr] sm:grid-cols-[3rem_1fr_8rem_6rem] px-4 py-2.5 border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500 uppercase tracking-wider dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-800">
      <span>#</span>
      <span>标题</span>
      <span class="hidden sm:block text-right">播出日期</span>
      <span class="hidden sm:block text-right">时长</span>
    </div>

    <!-- Scrollable body -->
    <div class="max-h-[60vh] overflow-y-auto">
      <!-- Empty state -->
      <div
        v-if="episodes.length === 0"
        class="px-4 py-12 text-center text-sm text-zinc-400 dark:text-zinc-500"
      >
        暂无剧集信息
      </div>

      <!-- Episode rows -->
      <div
        v-for="(ep, index) in episodes"
        :key="ep.id"
        class="grid grid-cols-[3rem_1fr] sm:grid-cols-[3rem_1fr_8rem_6rem] items-center px-4 py-3 border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors duration-150 dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:border-zinc-800"
        :class="{ 'bg-zinc-50/50 dark:bg-zinc-800/30': index % 2 === 1 }"
      >
        <!-- Episode number badge -->
        <span
          class="inline-flex items-center justify-center w-7 h-7 rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 text-xs font-mono font-semibold tabular-nums"
        >
          {{ ep.sort }}
        </span>

        <!-- Title -->
        <span class="text-sm text-zinc-800 dark:text-zinc-100 leading-snug pr-2 truncate">
          {{ ep.name_cn || ep.name }}
        </span>

        <!-- Air date -->
        <span class="hidden sm:block text-sm text-zinc-500 dark:text-zinc-400 text-right tabular-nums">
          {{ ep.airdate }}
        </span>

        <!-- Duration -->
        <span class="hidden sm:block text-sm text-zinc-400 dark:text-zinc-500 text-right tabular-nums">
          {{ ep.duration }}
        </span>
      </div>
    </div>
  </div>
</template>
