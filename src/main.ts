import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import i18n from './i18n'
import './assets/css/style.css'
import UiInput from './components/ui/input/input.vue'
import UiButton from './components/ui/button/button.vue'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)
app.component('ui-input', UiInput)
app.component('ui-button', UiButton)
app.mount('#app')
