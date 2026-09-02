export default defineNuxtPlugin(async () => {
  if (import.meta.server) {
    const { fetchMe } = useAuth()
    await fetchMe()
  }
})
