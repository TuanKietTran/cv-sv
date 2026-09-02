import { createHandler, useMediator } from "../cqrs";
import type { PlanRepository } from "../repos/plan.repo";

export interface ListPlansInput {
   publicOnly?: boolean;
   userId?: string;        // if set: return only user-created plans for this userId
}

export interface ListPlansOutput {
   plans: ReturnType<import("../domain/catalog").Plan["toJSON"]>[];
}

export function createListPlansHandler(repo: PlanRepository) {
   return createHandler<ListPlansInput, ListPlansOutput>(
      "ListPlans",
      async (payload) => {
         let plans;
         if (payload.userId) {
            plans = await repo.findByUser(payload.userId);
         } else if (payload.publicOnly !== false) {
            plans = await repo.findPublic();
         } else {
            plans = await repo.findAll();
         }
         return {
            success: true,
            data: { plans: plans.map((p) => p.toJSON()) },
         };
      },
   );
}

export function listPlansQuery(input: ListPlansInput = {}) {
   return { _type: "query" as const, requestName: "ListPlans", payload: input };
}

export function registerListPlans(repo: PlanRepository) {
   useMediator().registerQuery(createListPlansHandler(repo));
}
