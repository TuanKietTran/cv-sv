import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";
import { PlanId } from "../domain/catalog";
import type { SubscriptionRepository } from "../repos/subscription.repo";

export interface SchedulePlanChangeInput {
   subscriptionId: string;
   newPlanId: string;
}

export interface SchedulePlanChangeOutput {
   subscriptionId: string;
   newPlanId: string;
}

export function createSchedulePlanChangeHandler(repo: SubscriptionRepository) {
   return createHandler<SchedulePlanChangeInput, SchedulePlanChangeOutput>(
      "SchedulePlanChange",
      async (payload) => {
         const subId = SubscriptionId.of(payload.subscriptionId);
         const sub = await repo.findById(subId);
         if (!sub) {
            return {
               success: false,
               error: `Subscription not found: ${payload.subscriptionId}`,
            };
         }

         const newPlanId = PlanId.of(payload.newPlanId);
         const updated = sub.schedulePlanChange(newPlanId);
         await repo.save(updated);

         return {
            success: true,
            data: {
               subscriptionId: updated.id.value,
               newPlanId: newPlanId.value,
            },
         };
      },
   );
}

export function schedulePlanChangeCommand(input: SchedulePlanChangeInput) {
   return {
      _type: "command" as const,
      requestName: "SchedulePlanChange",
      payload: input,
   };
}

export function registerSchedulePlanChange(repo: SubscriptionRepository) {
   useMediator().registerCommand(createSchedulePlanChangeHandler(repo));
}
