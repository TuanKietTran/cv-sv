import { useMediator } from "@core/cqrs";
import { saveCvSourceCommand } from "@core/handlers/save-cv-source";
import type { UpdateCvDocumentInput } from "@core/domain/cv";
import { assertCvId } from "../../../adapters/cv/document-store";

export default defineEventHandler(async (event) => {
    const id = assertCvId(getRouterParam(event, "id") ?? "");
    const input = await readBody<UpdateCvDocumentInput>(event);
    return sendApiRequest(useMediator(), saveCvSourceCommand({ id, ...(input ?? {}) }));
});
