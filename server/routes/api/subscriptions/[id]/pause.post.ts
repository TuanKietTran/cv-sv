import { useMediator } from "@core/cqrs";
import { pauseSubscriptionCommand } from "@core/handlers/pause-subscription";

export default defineEventHandler(async (event) => {
   const id = getRouterParam(event, "id")!;
   const body = await readBody(event).catch(() => ({}));
   const mediator = useMediator();
   return mediator.send(pauseSubscriptionCommand({
      subscriptionId: id,
      pausedAt: body.pausedAt,
   }));
});
