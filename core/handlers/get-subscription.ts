import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";
import type { SubscriptionRepository } from "../repos/subscription.repo";

export interface GetSubscriptionInput {
   subscriptionId: string;
}

export interface GetSubscriptionOutput {
   id: string;
   userId: string;
   planId: string;
   status: string;
   startedAt: string;
   currentPeriodStart: string;
   currentPeriodEnd: string;
   trialEndsAt: string | null;
   cancelledAt: string | null;
   pausedAt: string | null;
   nextIntervalPlanId: string | null;
}

export function createGetSubscriptionHandler(repo: SubscriptionRepository) {
   return createHandler<GetSubscriptionInput, GetSubscriptionOutput>(
      "GetSubscription",
      async (payload) => {
         const id = SubscriptionId.of(payload.subscriptionId);
         const sub = await repo.findById(id);
         if (!sub) {
            return { success: false, error: `Subscription not found: ${payload.subscriptionId}` };
         }
         return { success: true, data: sub.toJSON() };
      },
   );
}

export function getSubscriptionQuery(input: GetSubscriptionInput) {
   return {
      _type: "query" as const,
      requestName: "GetSubscription",
      payload: input,
   };
}

export function registerGetSubscription(repo: SubscriptionRepository) {
   useMediator().registerQuery(createGetSubscriptionHandler(repo));
}
