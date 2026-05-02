<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    modelYear?: number
    modelMonth?: number
    availableMonths?: number[]
    availableYears?: number[]
  }>(),
  {
    modelYear: () => new Date().getFullYear(),
    modelMonth: () => new Date().getMonth() + 1,
    availableMonths: () => [],
    availableYears: () => [],
  },
)

const emit = defineEmits<{
  change: [payload: { year: number; month: number }]
}>()

const currentYear = new Date().getFullYear()
const minYear = 1892
const maxYear = currentYear + 1

const selectedYear = ref(props.modelYear)
const selectedMonth = ref(props.modelMonth)

const canGoPrev = computed(() => selectedYear.value > minYear)
const canGoNext = computed(() => selectedYear.value < maxYear)

function prevYear() {
  if (!canGoPrev.value) return
  selectedYear.value--
  emitChange()
}

function nextYear() {
  if (!canGoNext.value) return
  selectedYear.value++
  emitChange()
}

function selectMonth(month: number) {
  if (!isMonthAvailable(month)) return
  selectedMonth.value = month
  emitChange()
}

function isMonthAvailable(m: number): boolean {
  if (!props.availableMonths || props.availableMonths.length === 0) return true
  return props.availableMonths.includes(m)
}

function emitChange() {
  emit('change', { year: selectedYear.value, month: selectedMonth.value })
}

const yearDropdownOpen = ref(false)
const dropdownContainerRef = ref<HTMLElement | null>(null)

const yearList = computed(() => {
  if (props.availableYears.length > 0) return props.availableYears
  return Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
})

function selectYear(y: number) {
  selectedYear.value = y
  yearDropdownOpen.value = false
  emitChange()
}

function handleClickOutside(event: MouseEvent) {
  if (
    yearDropdownOpen.value &&
    dropdownContainerRef.value &&
    !dropdownContainerRef.value.contains(event.target as Node)
  ) {
    yearDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>

<template>
  <div class="rounded-xl bg-white border border-zinc-200 p-4 dark:bg-zinc-900 dark:border-zinc-700">
    <!-- Year selector -->
    <div class="relative flex items-center justify-between mb-4" ref="dropdownContainerRef">
      <button
        class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-zinc-500 disabled:hover:border-zinc-200 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:border-zinc-500"
        :disabled="!canGoPrev"
        @click="prevYear"
        aria-label="上一年"
      >
        <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M10 4L6 8l4 4" />
        </svg>
      </button>

      <button
        class="inline-flex items-center gap-1.5 text-base font-semibold text-zinc-800 tabular-nums tracking-wide cursor-pointer hover:text-indigo-600 transition-colors duration-150 select-none dark:text-zinc-200"
        @click.stop="yearDropdownOpen = !yearDropdownOpen"
        aria-label="选择年份"
      >
        {{ selectedYear }}
        <svg
          class="w-3.5 h-3.5 transition-transform duration-200"
          :class="{ 'rotate-180': yearDropdownOpen }"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      <button
        class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-zinc-500 disabled:hover:border-zinc-200 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:border-zinc-500"
        :disabled="!canGoNext"
        @click="nextYear"
        aria-label="下一年"
      >
        <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M6 4l4 4-4 4" />
        </svg>
      </button>

      <!-- Year dropdown -->
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="yearDropdownOpen"
          class="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-xl shadow-2xl border border-zinc-200 p-3 max-h-64 overflow-y-auto dark:bg-zinc-900 dark:border-zinc-700"
          @click.stop
        >
          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="year in yearList"
              :key="year"
              class="px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
              :class="
                selectedYear === year
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
              "
              @click="selectYear(year)"
            >
              {{ year }}
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Month grid -->
    <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
      <button
        v-for="(label, i) in months"
        :key="i"
        class="inline-flex items-center justify-center h-9 rounded-lg text-sm font-medium transition-colors duration-150"
        :class="[
          selectedMonth === i + 1
            ? 'bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900'
            : isMonthAvailable(i + 1)
              ? 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-800 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200'
              : 'bg-zinc-50 text-zinc-300 cursor-not-allowed dark:bg-zinc-800/50 dark:text-zinc-600',
        ]"
        :disabled="!isMonthAvailable(i + 1)"
        @click="selectMonth(i + 1)"
      >
        {{ label }}
      </button>
    </div>
  </div>
</template>
