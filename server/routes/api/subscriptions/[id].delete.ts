import { useMediator } from "@core/cqrs";
import { terminateSubscriptionCommand } from "@core/handlers/terminate-subscription";

export default defineEventHandler(async (event) => {
   const id = getRouterParam(event, "id")!;
   const mediator = useMediator();
   return sendApiRequest(mediator, terminateSubscriptionCommand({ subscriptionId: id }));
});
