import type { H3Event } from "h3";
import { getAuthSession } from "./session";

export async function requireCvOwner(event: H3Event): Promise<string> {
   const session = await getAuthSession(event);
   if (!session.data.userId) throw createError({ statusCode: 401, statusMessage: "Authentication required" });
   return session.data.userId;
}
