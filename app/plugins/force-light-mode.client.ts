// Сайт только светлый (кремовая палитра, §2.2). Жёстко форсим light:
// 1. Убираем класс .dark с <html> немедленно (до рендера компонентов)
// 2. Закрепляем preference = 'light' в @nuxtjs/color-mode
// Без этого компоненты Nuxt UI рендерятся тёмными если системная тема dark.
export default defineNuxtPlugin(() => {
  // Мгновенно убираем .dark до гидрации, чтобы не было flash тёмных инпутов
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark')
    document.documentElement.setAttribute('data-color-mode', 'light')
  }
  const colorMode = useColorMode()
  colorMode.preference = 'light'
  colorMode.value = 'light'
})
