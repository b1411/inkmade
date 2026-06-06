// Тонкая обёртка над @nuxtjs/supabase для единообразия импортов (§4).
// Клиент работает с anon-ключом под RLS (§3.8). Сервисный ключ — только серверный слой.
export const useSupabase = () => useSupabaseClient()
