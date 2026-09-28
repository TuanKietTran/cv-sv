import { existsSync, mkdirSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright-core";

/**
 * Read-only checks against a live deployment. Opt-in through
 * PRODUCTION_BASE_URL (never SMOKE_BASE_URL: the smoke suite registers
 * accounts and changes consent, which must not happen in production).
 *
 * Nothing here creates users, stores documents, or completes an OAuth
 * sign-in. Authenticated features may be disabled by host policy
 * (`*.deno.net`), so auth routes accept either their normal status or 404.
 */
const baseUrl = process.env.PRODUCTION_BASE_URL?.replace(/\/$/, "");
const executablePath = process.env.CHROMIUM_PATH ?? "";
const screenshotDir = process.env.PRODUCTION_SCREENSHOT_DIR ?? "test-results/production";
const http = baseUrl ? describe : describe.skip;
const browserSuite = baseUrl && executablePath && existsSync(executablePath) ? describe : describe.skip;

const get = async (path: string, init?: RequestInit) => {
   const started = performance.now();
   const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", ...init });
   const text = await response.text();
   let body: unknown = text;
   try { body = JSON.parse(text); } catch { /* HTML and text stay raw */ }
   return { status: response.status, body, text, headers: response.headers, ms: performance.now() - started };
};

http("production HTTP", () => {
   it("is healthy and answers quickly", async () => {
      const { status, body, ms } = await get("/api/health");
      expect(status).toBe(200);
      expect(body).toMatchObject({ status: "ok" });
      expect(ms).toBeLessThan(5_000);
   });

   it("server-renders the editor and public pages", async () => {
      for (const path of ["/", "/p", "/about"]) {
         const { status, text } = await get(path);
         expect(status, path).toBe(200);
         expect(text, path).toContain("<html");
         expect(text, path).toContain('id="__nuxt"');
      }
   });

   it("ships production auth configuration only", async () => {
      const { text } = await get("/");
      // validate-deployment-env rejects these at boot; this checks what users actually receive.
      expect(text).not.toMatch(/pk_test_[A-Za-z0-9]/);
      expect(text).not.toMatch(/sk_(live|test)_[A-Za-z0-9]/);
      expect(text).not.toContain("dev-only-secret");
   });

   it("lists public CV templates", async () => {
      const { status, body } = await get("/api/public/templates");
      expect(status).toBe(200);
      const templates = Array.isArray(body) ? body : (body as { templates?: unknown[] }).templates;
      expect(Array.isArray(templates)).toBe(true);
      expect(templates!.length).toBeGreaterThan(0);
   });

   it("keeps private APIs closed to anonymous callers", async () => {
      expect([401, 404]).toContain((await get("/api/auth/me")).status);
      expect([401, 404]).toContain((await get("/api/cloud-data/consent")).status);
      expect([401, 404]).toContain((await get("/api/cv-capabilities")).status);
      const save = await get("/api/cv-templates", {
         method: "POST",
         headers: { "content-type": "application/json" },
         body: JSON.stringify({ name: "production-probe", markdownSkeleton: "# X", css: "" }),
      });
      expect([401, 404]).toContain(save.status);
   });

   it("answers MCP initialize", async () => {
      const response = await fetch(`${baseUrl}/mcp`, {
         method: "POST",
         headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
         body: JSON.stringify({
            jsonrpc: "2.0", id: 1, method: "initialize",
            params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "production-check", version: "0" } },
         }),
      });
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("cv-sv");
   });
});

browserSuite("production browser", () => {
   let browser: Browser;

   beforeAll(async () => {
      mkdirSync(screenshotDir, { recursive: true });
      browser = await chromium.launch({ executablePath, headless: true });
   }, 30_000);

   afterAll(async () => {
      await browser?.close();
   });

   /** Open a page in a fresh private context and collect uncaught errors. */
   const openPage = async (path: string) => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      context.setDefaultTimeout(20_000);
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      // The editor holds an EventSource open, so never wait for network idle.
      await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Boolean((document.querySelector("#__nuxt") as HTMLElement & { __vue_app__?: unknown })?.__vue_app__));
      return { context, page, errors };
   };

   const snap = (page: Page, name: string) => page.screenshot({ path: `${screenshotDir}/${name}.png` });

   it("hydrates public pages without runtime errors", async () => {
      for (const path of ["/", "/p", "/about"]) {
         const { context, page, errors } = await openPage(path);
         await page.waitForTimeout(1_000);
         await snap(page, `page${path.replace(/\//g, "-") || "-root"}`);
         expect(errors, path).toEqual([]);
         await context.close();
      }
   }, 90_000);

   it("opens the sign-in dialog with GitHub and Google, and closes it cleanly", async (ctx) => {
      const { context, page, errors } = await openPage("/about");
      const trigger = page.locator("[data-account-trigger]").first();
      if (await trigger.count() === 0) {
         await context.close();
         ctx.skip(); // Authenticated features are disabled on this host.
         return;
      }

      await trigger.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      await page.locator('[class*="cl-socialButtonsIconButton__github"], [class*="cl-socialButtonsBlockButton__github"]').first().waitFor();
      await page.locator('[class*="cl-socialButtonsIconButton__google"], [class*="cl-socialButtonsBlockButton__google"]').first().waitFor();
      expect(await dialog.getAttribute("data-auth-view")).toBe("signedOut");
      expect(await page.getByText("failed to load").count()).toBe(0);
      await snap(page, "auth-dialog");

      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
      expect(await page.evaluate(() => document.activeElement?.hasAttribute("data-account-trigger"))).toBe(true);
      expect(errors).toEqual([]);
      await context.close();
   }, 60_000);

   for (const provider of [
      { name: "github", host: /(^|\.)github\.com$/ },
      { name: "google", host: /(^|\.)accounts\.google\.com$/ },
   ]) {
      it(`starts the ${provider.name} OAuth redirect (stops before authorization)`, async (ctx) => {
         const { context, page } = await openPage("/about");
         const trigger = page.locator("[data-account-trigger]").first();
         if (await trigger.count() === 0) {
            await context.close();
            ctx.skip();
            return;
         }
         await trigger.click();
         const button = page.locator(
            `[class*="cl-socialButtonsIconButton__${provider.name}"], [class*="cl-socialButtonsBlockButton__${provider.name}"]`,
         ).first();
         await button.click();
         await page.waitForURL(url => provider.host.test(url.hostname), { timeout: 30_000 });
         await snap(page, `oauth-${provider.name}`);
         await context.close();
      }, 60_000);
   }
});
