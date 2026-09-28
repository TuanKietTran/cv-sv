export default defineEventHandler(async (event) => {
   await (await getAdminSession(event)).clear();
   return { ok: true };
});
