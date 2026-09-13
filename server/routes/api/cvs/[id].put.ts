import type { UpdateCvDocumentInput } from "../../../../shared/types/cv";
import { assertCvId, updateCvDocument } from "../../../utils/cv-documents";

export default defineEventHandler(async (event) => {
    const id = assertCvId(getRouterParam(event, "id") ?? "");
    const input = await readBody<UpdateCvDocumentInput>(event);
    return updateCvDocument(id, input ?? {});
});
