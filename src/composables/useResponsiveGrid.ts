import { ref, computed, onMounted, onUnmounted, nextTick, type Ref } from 'vue'

const BREAKPOINTS: [number, number][] = [
  [1280, 6],
  [1024, 5],
  [768, 4],
  [640, 3],
  [320, 2],
]

function resolveColumns(width: number): number {
  for (const [minWidth, cols] of BREAKPOINTS) {
    if (width >= minWidth) return cols
  }
  return 1
}

export function useResponsiveGrid(containerRef: Ref<HTMLElement | null>) {
  const columnCount = ref(1)
  let observer: ResizeObserver | null = null

  const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${columnCount.value}, 1fr)`,
  }))

  function updateColumns() {
    const width = containerRef.value?.clientWidth || window.innerWidth
    if (width > 0) {
      columnCount.value = resolveColumns(width)
    }
  }

  function handleResize(entries: ResizeObserverEntry[]) {
    const entry = entries[0]
    if (entry && entry.contentRect.width > 0) {
      columnCount.value = resolveColumns(entry.contentRect.width)
    }
  }

  onMounted(async () => {
    await nextTick()
    // iOS Safari sometimes reports 0 clientWidth synchronously;
    // rAF + fallback to window.innerWidth ensures we get a real value
    requestAnimationFrame(() => {
      updateColumns()
      const el = containerRef.value
      if (el && 'ResizeObserver' in window) {
        observer = new ResizeObserver(handleResize)
        observer.observe(el)
      }
    })
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return { columnCount, gridStyle }
}
