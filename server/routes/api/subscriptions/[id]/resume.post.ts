import { useMediator } from "@core/cqrs";
import { resumeSubscriptionCommand } from "@core/handlers/resume-subscription";

export default defineEventHandler(async (event) => {
   const id = getRouterParam(event, "id")!;
   const mediator = useMediator();
   return mediator.send(resumeSubscriptionCommand({ subscriptionId: id }));
});
