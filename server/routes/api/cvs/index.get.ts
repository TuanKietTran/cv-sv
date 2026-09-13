import { listCvDocuments } from "../../../utils/cv-documents";

export default defineEventHandler(async () => ({
    documents: await listCvDocuments(),
}));
