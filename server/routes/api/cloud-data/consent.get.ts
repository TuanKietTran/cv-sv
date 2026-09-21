import { useMediator } from "@core/cqrs";
import { getCloudDataConsentQuery } from "@core/handlers/get-cloud-data-consent";

export default defineEventHandler(async (event) => {
   const userId = await requireAuthUser(event);
   return sendApiRequest(useMediator(), getCloudDataConsentQuery({ userId }));
});
