<script setup lang="ts">
withDefaults(
  defineProps<{
    message?: string
    retry?: () => void
  }>(),
  {
    message: '加载失败，请稍后重试',
    retry: undefined,
  },
)
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] gap-6">
    <!-- Error Icon -->
    <div class="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-950 flex items-center justify-center mb-2">
      <svg
        class="w-10 h-10 text-rose-400 dark:text-rose-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>

    <!-- Message -->
    <p class="text-base font-medium text-zinc-600 dark:text-zinc-400 text-center max-w-sm">{{ message }}</p>

    <!-- Retry Button -->
    <button
      v-if="retry"
      class="bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 text-white px-6 py-2.5 rounded-xl hover:from-indigo-600 hover:to-purple-600 dark:hover:from-indigo-500 dark:hover:to-purple-500 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all text-sm font-semibold"
      @click="retry"
    >
      重试
    </button>
  </div>
</template>
