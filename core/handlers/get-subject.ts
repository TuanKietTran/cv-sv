import { createHandler, useMediator } from "../cqrs";
import { UserId } from "../domain/iam/user-id";
import type { Tier } from "../domain/iam/subject-attributes";
import type { IamSubjectRepository } from "../repos/iam.repo";

export interface GetSubjectInput {
   userId: string;
}

export interface GetSubjectOutput {
   userId: string;
   orgId: string | null;
   tier: Tier;
   isServiceAccount: boolean;
}

export function createGetSubjectHandler(repo: IamSubjectRepository) {
   return createHandler<GetSubjectInput, GetSubjectOutput>(
      "GetSubject",
      async (payload) => {
         const userId = UserId.of(payload.userId);
         const stored = await repo.findByUserId(userId);
         if (!stored) {
            return { success: false, error: `Subject not found: ${payload.userId}` };
         }
         return { success: true, data: stored };
      },
   );
}

export function getSubjectQuery(input: GetSubjectInput) {
   return {
      _type: "query" as const,
      requestName: "GetSubject",
      payload: input,
   };
}

export function registerGetSubject(repo: IamSubjectRepository) {
   useMediator().registerQuery(createGetSubjectHandler(repo));
}
