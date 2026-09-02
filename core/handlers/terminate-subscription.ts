import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";
import type { SubscriptionRepository } from "../repos/subscription.repo";

export interface TerminateSubscriptionInput {
   subscriptionId: string;
}

export function createTerminateSubscriptionHandler(repo: SubscriptionRepository) {
   return createHandler<TerminateSubscriptionInput, { subscriptionId: string }>(
      "TerminateSubscription",
      async (payload) => {
         const id = SubscriptionId.of(payload.subscriptionId);
         const sub = await repo.findById(id);
         if (!sub) {
            return { success: false, error: `Subscription not found: ${payload.subscriptionId}` };
         }
         await repo.delete(id);
         return { success: true, data: { subscriptionId: id.value } };
      },
   );
}

export function terminateSubscriptionCommand(input: TerminateSubscriptionInput) {
   return {
      _type: "command" as const,
      requestName: "TerminateSubscription",
      payload: input,
   };
}

export function registerTerminateSubscription(repo: SubscriptionRepository) {
   useMediator().registerCommand(createTerminateSubscriptionHandler(repo));
}
