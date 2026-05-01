import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

const BREAKPOINTS: [number, number][] = [
  [1280, 6],
  [1024, 5],
  [768, 4],
  [640, 3],
  [360, 2],
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

  function handleResize(entries: ResizeObserverEntry[]) {
    const entry = entries[0]
    if (entry) {
      columnCount.value = resolveColumns(entry.contentRect.width)
    }
  }

  onMounted(() => {
    const el = containerRef.value
    if (!el) return

    // Set initial value
    columnCount.value = resolveColumns(el.clientWidth)

    observer = new ResizeObserver(handleResize)
    observer.observe(el)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return { columnCount, gridStyle }
}
