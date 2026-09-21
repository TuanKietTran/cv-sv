export default defineNuxtPlugin(async () => {
  if (import.meta.server) {
    const { fetchMe } = useAppAuth()
    await fetchMe()
  }
})
