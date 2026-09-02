import { createHandler, useMediator } from "../cqrs";
import { Subscription } from "../domain/subscription/subscription";
import { BillingCycle } from "../domain/subscription/billing-cycle";
import { Duration } from "../domain/datetime/duration";
import { Instant } from "../domain/datetime/instant";
import type { SubscriptionRepository } from "../repos/subscription.repo";

export interface CreateSubscriptionInput {
   userId: string;
   planId: string;
   billingPeriod?: string;
   startAt?: string;
   trialDays?: number;
}

export interface CreateSubscriptionOutput {
   subscriptionId: string;
}

export function createCreateSubscriptionHandler(repo: SubscriptionRepository) {
   return createHandler<CreateSubscriptionInput, CreateSubscriptionOutput>(
      "CreateSubscription",
      async (payload) => {
         const startAt = payload.startAt
            ? Instant.fromISO(payload.startAt)
            : Instant.now();

         const cycle = BillingCycle.of((payload.billingPeriod as any) ?? "monthly");
         const periodEnd = startAt.plusMillis(cycle.duration.millis);
         const trialDuration = payload.trialDays
            ? Duration.fromDays(payload.trialDays)
            : undefined;

         const sub = Subscription.create({
            id: crypto.randomUUID(),
            userId: payload.userId,
            planId: payload.planId,
            startAt,
            periodEnd,
            trialDuration,
         });

         await repo.save(sub);

         return {
            success: true,
            data: { subscriptionId: sub.id.value },
         };
      },
   );
}

export function createSubscriptionCommand(input: CreateSubscriptionInput) {
   return {
      _type: "command" as const,
      requestName: "CreateSubscription",
      payload: input,
   };
}

export function registerCreateSubscription(repo: SubscriptionRepository) {
   useMediator().registerCommand(createCreateSubscriptionHandler(repo));
}
