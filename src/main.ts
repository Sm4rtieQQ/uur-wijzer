import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'
import { currentRoute, resolveStartRoute } from './router/router'
import { useAppStore } from './state/appStore'

const store = useAppStore()
currentRoute.value = resolveStartRoute(store)

createApp(App).mount('#app')
