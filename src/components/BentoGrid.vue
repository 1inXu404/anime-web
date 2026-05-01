<script setup lang="ts">
import { ref, computed } from 'vue'
import { useResponsiveGrid } from '@/composables/useResponsiveGrid'

const props = withDefaults(
  defineProps<{
    cols?: number
  }>(),
  { cols: undefined },
)

const containerRef = ref<HTMLElement | null>(null)
const { columnCount } = useResponsiveGrid(containerRef)

const resolvedCols = computed(() => props.cols ?? columnCount.value)
</script>

<template>
  <div
    ref="containerRef"
    class="grid gap-4 sm:gap-5"
    :style="{ gridTemplateColumns: `repeat(${resolvedCols}, minmax(0, 1fr))` }"
  >
    <slot />
  </div>
</template>
