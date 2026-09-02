import { useMediator } from "@core/cqrs";
import { getSubscriptionQuery } from "@core/handlers/get-subscription";

export default defineEventHandler(async (event) => {
   const id = getRouterParam(event, "id")!;
   const mediator = useMediator();
   return mediator.send(getSubscriptionQuery({ subscriptionId: id }));
});
