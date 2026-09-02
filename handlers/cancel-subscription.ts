import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";
import { Instant } from "../domain/datetime/instant";
import type { SubscriptionRepository } from "../repos/subscription.repo";

export interface CancelSubscriptionInput {
   subscriptionId: string;
   cancelledAt?: string;
}

export interface CancelSubscriptionOutput {
   subscriptionId: string;
   cancelledAt: string;
}

export function createCancelSubscriptionHandler(repo: SubscriptionRepository) {
   return createHandler<CancelSubscriptionInput, CancelSubscriptionOutput>(
      "CancelSubscription",
      async (payload) => {
         const id = SubscriptionId.of(payload.subscriptionId);
         const sub = await repo.findById(id);
         if (!sub) {
            return { success: false, error: `Subscription not found: ${payload.subscriptionId}` };
         }

         const at = payload.cancelledAt ? Instant.fromISO(payload.cancelledAt) : Instant.now();
         const cancelled = sub.cancel(at);
         await repo.save(cancelled);

         return {
            success: true,
            data: {
               subscriptionId: cancelled.id.value,
               cancelledAt: at.toISO(),
            },
         };
      },
   );
}

export function cancelSubscriptionCommand(input: CancelSubscriptionInput) {
   return {
      _type: "command" as const,
      requestName: "CancelSubscription",
      payload: input,
   };
}

export function registerCancelSubscription(repo: SubscriptionRepository) {
   useMediator().registerCommand(createCancelSubscriptionHandler(repo));
}
