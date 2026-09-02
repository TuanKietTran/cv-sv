import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";
import { Instant } from "../domain/datetime/instant";
import { BillingCycle } from "../domain/subscription/billing-cycle";
import type { BillingPeriod } from "../domain/subscription/billing-cycle";
import type { SubscriptionRepository } from "../repos/subscription.repo";

export interface RenewSubscriptionInput {
   subscriptionId: string;
   renewedAt?: string;
   billingPeriod?: string;
}

export interface RenewSubscriptionOutput {
   subscriptionId: string;
   newPeriodStart: string;
   newPeriodEnd: string;
}

export function createRenewSubscriptionHandler(repo: SubscriptionRepository) {
   return createHandler<RenewSubscriptionInput, RenewSubscriptionOutput>(
      "RenewSubscription",
      async (payload) => {
         const id = SubscriptionId.of(payload.subscriptionId);
         const sub = await repo.findById(id);
         if (!sub) {
            return { success: false, error: `Subscription not found: ${payload.subscriptionId}` };
         }

         const at = payload.renewedAt ? Instant.fromISO(payload.renewedAt) : Instant.now();
         const cycle = BillingCycle.of((payload.billingPeriod as BillingPeriod) ?? "monthly");
         const newPeriodEnd = at.plusMillis(cycle.duration.millis);

         const renewed = sub.renew(at, newPeriodEnd);
         await repo.save(renewed);

         return {
            success: true,
            data: {
               subscriptionId: renewed.id.value,
               newPeriodStart: at.toISO(),
               newPeriodEnd: newPeriodEnd.toISO(),
            },
         };
      },
   );
}

export function renewSubscriptionCommand(input: RenewSubscriptionInput) {
   return {
      _type: "command" as const,
      requestName: "RenewSubscription",
      payload: input,
   };
}

export function registerRenewSubscription(repo: SubscriptionRepository) {
   useMediator().registerCommand(createRenewSubscriptionHandler(repo));
}
