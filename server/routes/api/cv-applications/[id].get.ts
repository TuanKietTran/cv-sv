import { useMediator } from "@core/cqrs";
import { getCvApplicationQuery } from "@core/handlers/get-cv-application";
import { requireCvOwner } from "../../../utils/cv-owner";

export default defineEventHandler(async (event) => {
   const ownerId = await requireCvOwner(event);
   const id = getRouterParam(event, "id") ?? "";
   return sendApiRequest(useMediator(), getCvApplicationQuery({ id, ownerId }));
});
