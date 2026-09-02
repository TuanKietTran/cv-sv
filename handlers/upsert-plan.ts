import { createHandler, useMediator } from "../cqrs";
import { Plan } from "../domain/catalog";
import { Money } from "../domain/subscription/money";
import { BillingCycle } from "../domain/subscription/billing-cycle";
import { Duration } from "../domain/datetime/duration";
import type { CurrencyCode } from "../domain/subscription/money";
import type { BillingPeriod } from "../domain/subscription/billing-cycle";
import type { PlanRepository } from "../repos/plan.repo";

export interface UpsertPlanInput {
   id: string;
   name: string;
   description: string;
   provider?: string;
   source?: "user" | "catalog";
   createdBy?: string | null;
   amountMinor: number;
   currency: CurrencyCode;
   billingPeriod: BillingPeriod;
   trialDays?: number | null;
   features?: string[];
   isPublic?: boolean;
}

export interface UpsertPlanOutput {
   planId: string;
}

export function createUpsertPlanHandler(repo: PlanRepository) {
   return createHandler<UpsertPlanInput, UpsertPlanOutput>(
      "UpsertPlan",
      async (payload) => {
         const plan = Plan.create({
            id: payload.id,
            name: payload.name,
            description: payload.description,
            provider: payload.provider,
            source: payload.source,
            createdBy: payload.createdBy,
            price: Money.of(payload.amountMinor, payload.currency),
            billingCycle: BillingCycle.of(payload.billingPeriod),
            trialDuration: payload.trialDays
               ? Duration.fromDays(payload.trialDays)
               : undefined,
            features: payload.features ?? [],
            isPublic: payload.isPublic ?? true,
         });

         await repo.save(plan);
         return { success: true, data: { planId: plan.id.value } };
      },
   );
}

export function upsertPlanCommand(input: UpsertPlanInput) {
   return {
      _type: "command" as const,
      requestName: "UpsertPlan",
      payload: input,
   };
}

export function registerUpsertPlan(repo: PlanRepository) {
   useMediator().registerCommand(createUpsertPlanHandler(repo));
}
