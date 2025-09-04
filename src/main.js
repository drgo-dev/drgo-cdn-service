import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

import { useUserStore } from '@/stores/user'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const userStore = useUserStore()
userStore.initOnce()

app.mount('#app')
