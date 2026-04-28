import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import i18n from './i18n'
import './assets/css/style.css'
import 'vue-sonner/style.css'
import { registerGlobalComponents } from './plugins/globalComponents'

const app = createApp(App)
registerGlobalComponents(app)

app.use(pinia)
app.use(router)
app.use(i18n)

app.mount('#app')
