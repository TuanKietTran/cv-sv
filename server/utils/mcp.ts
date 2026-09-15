import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { useMediator } from "@core/cqrs";
import { listCvDocumentsQuery } from "@core/handlers/list-cv-documents";
import { getCvDocumentQuery } from "@core/handlers/get-cv-document";
import { saveCvSourceCommand } from "@core/handlers/save-cv-source";
import { patchCvSourceCommand } from "@core/handlers/patch-cv-source";

const textResult = (value: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

/** Create an isolated MCP protocol server for one stateless HTTP request. */
export function createCvMcpServer(): McpServer {
    const server = new McpServer({ name: "cv-sv", version: "0.1.0" });
    const mediator = useMediator();

    server.registerTool("list_cvs", {
        description: "List CV documents and their current revisions",
    }, async () => textResult({ documents: await mediator.send(listCvDocumentsQuery()) }));

    server.registerTool("open_cv", {
        description: "Read the Markdown, CSS and revision of a CV document",
        inputSchema: { id: z.string().default("master") },
    }, async ({ id }) => textResult(await mediator.send(getCvDocumentQuery({ id }))));

    server.registerTool("save_cv", {
        description: "Save complete Markdown and/or CSS. Pass expectedRevision to prevent overwriting concurrent edits.",
        inputSchema: {
            id: z.string().default("master"),
            markdown: z.string().optional(),
            css: z.string().optional(),
            expectedRevision: z.number().int().positive().optional(),
        },
    }, async ({ id, markdown, css, expectedRevision }) => textResult(
        await mediator.send(saveCvSourceCommand({
            id,
            markdown,
            css,
            expectedRevision,
            sourceId: "mcp",
        })),
    ));

    server.registerTool("patch_cv", {
        description: "Replace one unique piece of Markdown or CSS and publish the edit to connected browsers.",
        inputSchema: {
            id: z.string().default("master"),
            target: z.enum(["markdown", "css"]),
            oldText: z.string().min(1),
            newText: z.string(),
            expectedRevision: z.number().int().positive().optional(),
        },
    }, async ({ id, target, oldText, newText, expectedRevision }) => textResult(
        await mediator.send(patchCvSourceCommand({
            id,
            target,
            oldText,
            newText,
            expectedRevision,
            sourceId: "mcp",
        })),
    ));

    return server;
}
