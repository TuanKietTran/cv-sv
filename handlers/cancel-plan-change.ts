import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";
import type { SubscriptionRepository } from "../repos/subscription.repo";

export interface CancelPlanChangeInput {
   subscriptionId: string;
}

export interface CancelPlanChangeOutput {
   subscriptionId: string;
}

export function createCancelPlanChangeHandler(repo: SubscriptionRepository) {
   return createHandler<CancelPlanChangeInput, CancelPlanChangeOutput>(
      "CancelPlanChange",
      async (payload) => {
         const subId = SubscriptionId.of(payload.subscriptionId);
         const sub = await repo.findById(subId);
         if (!sub) {
            return { success: false, error: `Subscription not found: ${payload.subscriptionId}` };
         }

         const updated = sub.cancelPlanChange();
         await repo.save(updated);

         return {
            success: true,
            data: { subscriptionId: updated.id.value },
         };
      },
   );
}

export function cancelPlanChangeCommand(input: CancelPlanChangeInput) {
   return {
      _type: "command" as const,
      requestName: "CancelPlanChange",
      payload: input,
   };
}

export function registerCancelPlanChange(repo: SubscriptionRepository) {
   useMediator().registerCommand(createCancelPlanChangeHandler(repo));
}
