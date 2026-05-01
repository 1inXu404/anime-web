import { ref } from 'vue'

const FILTER_KEY = 'anime-web-r18'

const showR18 = ref(localStorage.getItem(FILTER_KEY) === 'true')

export function useContentFilter() {
  function toggleR18() {
    showR18.value = !showR18.value
    localStorage.setItem(FILTER_KEY, String(showR18.value))
  }
  return { showR18, toggleR18 }
}
