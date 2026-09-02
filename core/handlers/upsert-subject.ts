import { createHandler, useMediator } from "../cqrs";
import { UserId } from "../domain/iam/user-id";
import type { Tier } from "../domain/iam/subject-attributes";
import type { IamSubjectRepository } from "../repos/iam.repo";

export interface UpsertSubjectInput {
   userId: string;
   tier: Tier;
   orgId?: string | null;
   isServiceAccount?: boolean;
}

export interface UpsertSubjectOutput {
   userId: string;
}

export function createUpsertSubjectHandler(repo: IamSubjectRepository) {
   return createHandler<UpsertSubjectInput, UpsertSubjectOutput>(
      "UpsertSubject",
      async (payload) => {
         UserId.of(payload.userId); // validate

         await repo.save({
            userId: payload.userId.trim(),
            orgId: payload.orgId ?? null,
            tier: payload.tier,
            isServiceAccount: payload.isServiceAccount ?? false,
         });

         return { success: true, data: { userId: payload.userId.trim() } };
      },
   );
}

export function upsertSubjectCommand(input: UpsertSubjectInput) {
   return {
      _type: "command" as const,
      requestName: "UpsertSubject",
      payload: input,
   };
}

export function registerUpsertSubject(repo: IamSubjectRepository) {
   useMediator().registerCommand(createUpsertSubjectHandler(repo));
}
