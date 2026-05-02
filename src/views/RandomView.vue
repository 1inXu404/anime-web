<script setup lang="ts">
import { ref } from 'vue'
import { getRandomSubject } from '@/api/bangumi'
import type { SubjectBrowse } from '@/types/bangumi'

const colors = [
  'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500',
  'bg-violet-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500',
  'bg-indigo-500', 'bg-lime-500', 'bg-cyan-500', 'bg-fuchsia-500',
  'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500',
]

const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'

function garbledText(): string {
  const len = 4 + Math.floor(Math.random() * 5) // 4-8 chars
  let s = ''
  for (let i = 0; i < len; i++) s += KATAKANA[Math.floor(Math.random() * KATAKANA.length)]
  return s
}

const usedIds = ref(new Set<number>())

const isDrawing = ref(false)
const hasDrawn = ref(false)
const result = ref<SubjectBrowse | null>(null)
const displayTitle = ref('今日看啥?')
const displayColor = ref('bg-indigo-500')
const displayImage = ref('')
const imageLoaded = ref(false)
const error = ref('')

async function startDraw() {
  if (isDrawing.value) return
  isDrawing.value = true
  hasDrawn.value = false
  result.value = null
  imageLoaded.value = false
  error.value = ''
  displayImage.value = ''

  const resultPromise = getRandomSubject(usedIds.value)

  let interval = 50
  let cycle = 0
  const maxCycles = 30

  const tick = () => {
    cycle++
    if (cycle <= 15) interval = 50
    else if (cycle <= 23) interval = 100
    else if (cycle <= 27) interval = 200
    else interval = 400

    if (cycle < maxCycles) {
      displayTitle.value = garbledText()
      displayColor.value = colors[Math.floor(Math.random() * colors.length)]
      setTimeout(tick, interval)
    } else {
      resultPromise.then(subject => {
        if (subject) {
          usedIds.value.add(subject.id)
          if (usedIds.value.size > 500) usedIds.value = new Set<number>()
          result.value = subject
          displayTitle.value = subject.name_cn || subject.name
          displayColor.value = colors[(subject.name_cn?.charCodeAt(0) || 0) % colors.length]
          displayImage.value = subject.images?.common || subject.images?.large || ''
        } else {
          error.value = '暂时没有找到推荐作品，请再试一次'
        }
        hasDrawn.value = true
        isDrawing.value = false
      }).catch(() => {
        error.value = '加载失败，请稍后再试'
        hasDrawn.value = true
        isDrawing.value = false
      })
    }
  }

  tick()
}

function formattedDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Hero Header -->
    <header class="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-900 dark:via-purple-900 dark:to-indigo-900 px-6 py-14 sm:px-8 sm:py-18">
      <div
        class="absolute inset-0 opacity-[0.06]"
        style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 28px 28px;"
      />
      <div class="relative max-w-6xl mx-auto text-center">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.15)]">
          今日看啥
        </h1>
        <p class="mt-3 text-lg sm:text-xl text-white/85">
          从 29,371 部作品中为你推荐一部
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center">
      <!-- Card Area -->
      <div class="w-full max-w-xs sm:max-w-sm">
        <!-- Card -->
        <component
          :is="result ? 'router-link' : 'div'"
          v-bind="result ? { to: `/anime/${result.id}` } : {}"
          class="block rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-md shadow-zinc-200/50 dark:shadow-zinc-950/50 hover:shadow-xl hover:shadow-violet-100/30 dark:hover:shadow-zinc-950/60 hover:-translate-y-1 hover:ring-1 hover:ring-violet-100 dark:hover:ring-zinc-700 transition-all duration-300 group cursor-pointer"
        >
          <!-- Cover Frame -->
          <div class="relative aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            <!-- Colored Placeholder -->
            <div
              class="absolute inset-0 flex items-center justify-center p-6 transition-colors duration-150"
              :class="displayColor"
            >
              <span class="text-white/90 text-xl sm:text-2xl font-bold text-center leading-snug select-none drop-shadow-sm">
                {{ displayTitle }}
              </span>
            </div>

            <!-- Real Image (fades in on result) -->
            <img
              v-if="displayImage"
              :src="displayImage"
              :alt="displayTitle"
              class="absolute inset-0 w-full h-full object-cover group-hover:scale-105"
              :style="{
                opacity: imageLoaded ? 1 : 0,
                filter: imageLoaded ? 'blur(0)' : 'blur(8px)',
                transform: imageLoaded ? 'scale(1)' : 'scale(1.05)',
                transition: 'opacity 0.6s ease, filter 0.6s ease, transform 0.6s ease',
              }"
              loading="eager"
              decoding="async"
              @load="imageLoaded = true"
              @error="imageLoaded = false"
            />

            <!-- Gradient Overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

            <!-- Score Badge -->
            <div
              v-if="result?.rating?.score"
              class="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-[0_0_12px_rgba(250,204,21,0.25)]"
            >
              <span>&#9733;</span>
              <span>{{ result.rating.score.toFixed(1) }}</span>
            </div>

            <!-- Drawing Indicator -->
            <div
              v-if="isDrawing"
              class="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div class="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          </div>

          <!-- Info Section (only when result exists) -->
          <div v-if="result" class="p-3 dark:bg-zinc-900">
            <p class="font-bold text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-snug">
              {{ result.name_cn || result.name }}
            </p>
            <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500 mt-1">
              <span v-if="result.eps">{{ result.eps }} 集</span>
              <span v-if="result.eps && result.date">·</span>
              <span v-if="result.date">{{ formattedDate(result.date) }}</span>
            </div>
          </div>
        </component>

        <!-- Error Message -->
        <p
          v-if="error"
          class="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-4"
        >
          {{ error }}
        </p>

        <!-- Draw Button -->
        <div class="flex justify-center mt-8">
          <button
            :disabled="isDrawing"
            class="px-8 py-3 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-bold text-base shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            @click="startDraw"
          >
            {{ isDrawing ? '抽取中...' : hasDrawn ? '🔄 再抽一次' : '🎴 抽一张' }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
