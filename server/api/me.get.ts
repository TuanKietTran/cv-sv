import type { AdminUser } from "~~/server/utils/admin-session";

export default defineEventHandler(event => event.context.admin as AdminUser);
