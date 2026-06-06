import VueKonva from 'vue-konva'

// Konva — только клиент (§7.4): SSR падает без canvas в Nitro.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueKonva)
})
