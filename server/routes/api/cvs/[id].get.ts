import { assertCvId, getCvDocument } from "../../../utils/cv-documents";

export default defineEventHandler(async (event) => {
    const id = assertCvId(getRouterParam(event, "id") ?? "");
    return getCvDocument(id);
});
