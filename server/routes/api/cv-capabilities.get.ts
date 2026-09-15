import { useMediator } from "@core/cqrs";
import { getCvCapabilitiesQuery } from "@core/handlers/get-cv-capabilities";
import { requireCvOwner } from "../../utils/cv-owner";

export default defineEventHandler(async (event) => {
   await requireCvOwner(event);
   return sendApiRequest(useMediator(), getCvCapabilitiesQuery());
});
