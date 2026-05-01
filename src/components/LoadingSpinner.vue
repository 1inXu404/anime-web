<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string
  }>(),
  {
    text: '加载中...',
  },
)
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] gap-5">
    <div
      class="w-12 h-12 border-[3px] border-zinc-100 dark:border-zinc-800 border-t-indigo-500 dark:border-t-indigo-400 rounded-full animate-spin shadow-lg shadow-indigo-100 dark:shadow-indigo-900/30"
    />
    <p class="text-base font-medium text-zinc-400 dark:text-zinc-500">{{ text }}</p>
  </div>
</template>
