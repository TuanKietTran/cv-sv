import { createHandler, useMediator } from "../cqrs";
import { UserId } from "../domain/iam/user-id";
import { SubjectAttributes } from "../domain/iam/subject-attributes";
import { ResourceAttributes } from "../domain/iam/resource-attributes";
import { Action } from "../domain/iam/action";
import { AccessRequest } from "../domain/iam/access-request";
import {
   PolicyEvaluator,
   OwnerFullAccessPolicy,
   ServiceAccountReadOnlyPolicy,
   SameOrgPolicy,
} from "../domain/iam/policy";
import type { ActionCode } from "../domain/iam/action";
import type { ResourceType } from "../domain/iam/resource-attributes";
import type { IamSubjectRepository } from "../repos/iam.repo";

export interface CheckAccessInput {
   userId: string;
   action: ActionCode;
   resourceType: ResourceType;
   resourceId: string;
   ownerUserId?: string | null;
   ownerOrgId?: string | null;
}

export interface CheckAccessOutput {
   allowed: boolean;
   effect: "allow" | "deny";
   reason: string;
}

const defaultEvaluator = new PolicyEvaluator([
   OwnerFullAccessPolicy,
   ServiceAccountReadOnlyPolicy,
   SameOrgPolicy,
]);

export function createCheckAccessHandler(repo: IamSubjectRepository) {
   return createHandler<CheckAccessInput, CheckAccessOutput>(
      "CheckAccess",
      async (payload) => {
         const userId = UserId.of(payload.userId);
         const stored = await repo.findByUserId(userId);
         if (!stored) {
            return { success: false, error: `Subject not found: ${payload.userId}` };
         }

         const isOwner = payload.ownerUserId != null && payload.ownerUserId === stored.userId;

         const subject = SubjectAttributes.of({
            userId: stored.userId,
            orgId: stored.orgId,
            tier: stored.tier,
            isOwner,
            isServiceAccount: stored.isServiceAccount,
         });

         const resource = ResourceAttributes.of({
            resourceType: payload.resourceType,
            resourceId: payload.resourceId,
            ownerUserId: payload.ownerUserId ?? null,
            ownerOrgId: payload.ownerOrgId ?? null,
         });

         const action = Action.of(payload.action);
         const request = AccessRequest.of(subject, resource, action);
         const decision = defaultEvaluator.evaluate(request);

         return {
            success: true,
            data: {
               allowed: decision.isAllowed(),
               effect: decision.effect,
               reason: decision.reason,
            },
         };
      },
   );
}

export function checkAccessQuery(input: CheckAccessInput) {
   return {
      _type: "query" as const,
      requestName: "CheckAccess",
      payload: input,
   };
}

export function registerCheckAccess(repo: IamSubjectRepository) {
   useMediator().registerQuery(createCheckAccessHandler(repo));
}
