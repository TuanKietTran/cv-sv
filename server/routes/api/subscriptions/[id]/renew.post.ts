import { useMediator } from "@core/cqrs";
import { renewSubscriptionCommand } from "@core/handlers/renew-subscription";

export default defineEventHandler(async (event) => {
   const id = getRouterParam(event, "id")!;
   const body = await readBody(event).catch(() => ({}));
   const mediator = useMediator();
   return mediator.send(renewSubscriptionCommand({
      subscriptionId: id,
      renewedAt: body.renewedAt,
      billingPeriod: body.billingPeriod,
   }));
});
