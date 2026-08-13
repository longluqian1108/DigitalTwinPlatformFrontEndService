import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/global.css'
import 'cesium/Build/Cesium/Widgets/widgets.css'

createApp(App).use(createPinia()).mount('#app')
