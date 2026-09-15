import { useMediator } from "@core/cqrs";
import { listCvDocumentsQuery } from "@core/handlers/list-cv-documents";

export default defineEventHandler(async () => ({
    documents: await sendApiRequest(useMediator(), listCvDocumentsQuery()),
}));
