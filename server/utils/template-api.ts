import { TemplateAdminError } from "../lib/templates";
import type { TemplateStorage } from "../lib/templates";

export const templateStorage = (): TemplateStorage => useStorage("cv");

/** Map template validation/conflict errors onto HTTP errors. */
export async function templateRequest<T>(run: () => Promise<T>): Promise<T> {
   try {
      return await run();
   } catch (error) {
      if (error instanceof TemplateAdminError) {
         throw createError({ statusCode: error.statusCode, statusMessage: error.message });
      }
      throw error;
   }
}
