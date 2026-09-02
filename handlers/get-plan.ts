import { createHandler, useMediator } from "../cqrs";
import { PlanId } from "../domain/catalog";
import type { PlanRepository } from "../repos/plan.repo";

export interface GetPlanInput {
   planId: string;
}

export type GetPlanOutput = ReturnType<
   import("../domain/catalog").Plan["toJSON"]
>;

export function createGetPlanHandler(repo: PlanRepository) {
   return createHandler<GetPlanInput, GetPlanOutput>(
      "GetPlan",
      async (payload) => {
         const id = PlanId.of(payload.planId);
         const plan = await repo.findById(id);
         if (!plan) {
            return {
               success: false,
               error: `Plan not found: ${payload.planId}`,
            };
         }
         return { success: true, data: plan.toJSON() };
      },
   );
}

export function getPlanQuery(input: GetPlanInput) {
   return { _type: "query" as const, requestName: "GetPlan", payload: input };
}

export function registerGetPlan(repo: PlanRepository) {
   useMediator().registerQuery(createGetPlanHandler(repo));
}
