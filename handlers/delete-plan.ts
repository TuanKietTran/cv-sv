import { createHandler, useMediator } from "../cqrs";
import { PlanId } from "../domain/catalog";
import type { PlanRepository } from "../repos/plan.repo";

export interface DeletePlanInput {
   planId: string;
}

export interface DeletePlanOutput {
   planId: string;
}

export function createDeletePlanHandler(repo: PlanRepository) {
   return createHandler<DeletePlanInput, DeletePlanOutput>(
      "DeletePlan",
      async (payload) => {
         const id = PlanId.of(payload.planId);
         const existing = await repo.findById(id);
         if (!existing) {
            return {
               success: false,
               error: `Plan not found: ${payload.planId}`,
            };
         }
         await repo.delete(id);
         return { success: true, data: { planId: id.value } };
      },
   );
}

export function deletePlanCommand(input: DeletePlanInput) {
   return {
      _type: "command" as const,
      requestName: "DeletePlan",
      payload: input,
   };
}

export function registerDeletePlan(repo: PlanRepository) {
   useMediator().registerCommand(createDeletePlanHandler(repo));
}
