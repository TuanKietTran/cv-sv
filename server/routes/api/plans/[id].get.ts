import { useMediator } from "@core/cqrs";
import { getPlanQuery } from "@core/handlers/get-plan";

export default defineEventHandler(async (event) => {
   const id = getRouterParam(event, "id")!;
   const mediator = useMediator();
   return sendApiRequest(mediator, getPlanQuery({ planId: id }));
});
