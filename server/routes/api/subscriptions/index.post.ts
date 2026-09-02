import { useMediator } from "@core/cqrs";
import { createSubscriptionCommand } from "@core/handlers/create-subscription";

export default defineEventHandler(async (event) => {
   const body = await readBody(event);
   const mediator = useMediator();
   const data = await mediator.send(createSubscriptionCommand({
      userId: body.userId,
      planId: body.planId,
      billingPeriod: body.billingPeriod,
      startAt: body.startAt,
      trialDays: body.trialDays,
   }));
   setResponseStatus(event, 201);
   return data;
});
