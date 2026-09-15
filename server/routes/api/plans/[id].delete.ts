import { useMediator } from "@core/cqrs";
import { deletePlanCommand } from "@core/handlers/delete-plan";

export default defineEventHandler(async (event) => {
   const id = getRouterParam(event, "id")!;
   const mediator = useMediator();
   return sendApiRequest(mediator, deletePlanCommand({ planId: id }));
});
