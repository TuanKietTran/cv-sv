import { useMediator } from "@core/cqrs";
import { cancelSubscriptionCommand } from "@core/handlers/cancel-subscription";

export default defineEventHandler(async (event) => {
   const id = getRouterParam(event, "id")!;
   const body = (await readBody(event).catch(() => undefined)) ?? {};
   const mediator = useMediator();
   return mediator.send(cancelSubscriptionCommand({
      subscriptionId: id,
      cancelledAt: body.cancelledAt,
   }));
});
