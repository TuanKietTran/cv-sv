import { useMediator } from "@core/cqrs";
import { cancelPlanChangeCommand } from "@core/handlers/cancel-plan-change";

export default defineEventHandler(async (event) => {
   const id = getRouterParam(event, "id")!;
   const mediator = useMediator();
   return mediator.send(cancelPlanChangeCommand({ subscriptionId: id }));
});
