import { beforeAll, describe, expect, it } from "vitest";

/**
 * Opt-in smoke suite. It runs only when SMOKE_BASE_URL points at a running
 * server (`pnpm dev`, then `pnpm test:smoke`); otherwise every case is skipped
 * so the default `pnpm test` stays hermetic.
 */
const baseUrl = process.env.SMOKE_BASE_URL?.replace(/\/$/, "");
const smoke = baseUrl ? describe : describe.skip;

const call = async (path: string, init?: RequestInit) => {
   const response = await fetch(`${baseUrl}${path}`, init);
   const text = await response.text();
   let body: unknown = text;
   try { body = JSON.parse(text); } catch { /* non-JSON responses stay raw */ }
   return { status: response.status, body, headers: response.headers };
};

const json = (payload: unknown): RequestInit => ({
   method: "POST",
   headers: { "content-type": "application/json" },
   body: JSON.stringify(payload),
});

smoke("HTTP smoke", () => {
   beforeAll(async () => {
      const reachable = await fetch(`${baseUrl}/api/health`).then(() => true).catch(() => false);
      if (!reachable) throw new Error(`No server at ${baseUrl}; start \`pnpm dev\` first`);
   }, 30_000);

   it("serves health", async () => {
      expect((await call("/api/health")).status).toBe(200);
   });

   it("reports CV pipeline capabilities without failing the request", async () => {
      const { status, body } = await call("/api/cv-capabilities");
      expect(status).toBe(200);
      expect(body).toMatchObject({ renderer: "cv-pipeline", available: expect.any(Boolean) });
   });

   it("lists public CV templates unauthenticated", async () => {
      const { status, body } = await call("/api/public/templates");
      expect(status).toBe(200);
      expect(Array.isArray(body) || Array.isArray((body as { templates?: unknown[] }).templates)).toBe(true);
   });

   it("requires a session to save a CV template", async () => {
      const { status } = await call("/api/cv-templates", json({ name: "x", markdownSkeleton: "# X", css: "" }));
      expect(status).toBe(401);
   });

   it("rejects malformed registration before touching persistence", async () => {
      const { status } = await call("/api/auth/register", json({ email: "", password: "" }));
      expect(status).toBe(400);
   });

   it("rejects invalid credentials", async () => {
      const { status } = await call("/api/auth/login", json({ email: "nobody@example.com", password: "wrong-password" }));
      expect(status).toBe(401);
   });

   it("reports no session for an anonymous caller", async () => {
      const { status, body } = await call("/api/auth/me");
      expect([200, 401]).toContain(status);
      if (status === 200) expect(body).not.toHaveProperty("passwordHash");
   });

   it("answers MCP initialize over Streamable HTTP", async () => {
      const response = await fetch(`${baseUrl}/mcp`, {
         method: "POST",
         headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
         body: JSON.stringify({
            jsonrpc: "2.0", id: 1, method: "initialize",
            params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "0" } },
         }),
      });
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("cv-sv");
   });

   it("serves the editor shell", async () => {
      const { status, body } = await call("/");
      expect(status).toBe(200);
      expect(String(body)).toContain("<html");
   });

   it("serves the unauthenticated local profile editor", async () => {
      expect((await call("/profiles")).status).toBe(200);
   });
});
