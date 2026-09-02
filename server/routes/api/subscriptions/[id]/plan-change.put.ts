import { useMediator } from "@core/cqrs";
import { schedulePlanChangeCommand } from "@core/handlers/schedule-plan-change";

export default defineEventHandler(async (event) => {
   const id = getRouterParam(event, "id")!;
   const body = await readBody(event);
   const mediator = useMediator();
   return mediator.send(schedulePlanChangeCommand({
      subscriptionId: id,
      newPlanId: body.newPlanId,
   }));
});
