import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useTheme } from './composables/useTheme'
import './style.css'

// Initialize theme before app mounts
useTheme()

const app = createApp(App)
app.use(router)
app.mount('#app')
