import { createHandler, useMediator } from "../cqrs";
import { UserId } from "../domain/iam/user-id";
import type { IamSubjectRepository } from "../repos/iam.repo";

export interface DeleteSubjectInput {
   userId: string;
}

export interface DeleteSubjectOutput {
   userId: string;
}

export function createDeleteSubjectHandler(repo: IamSubjectRepository) {
   return createHandler<DeleteSubjectInput, DeleteSubjectOutput>(
      "DeleteSubject",
      async (payload) => {
         const userId = UserId.of(payload.userId);
         const existing = await repo.findByUserId(userId);
         if (!existing) {
            return { success: false, error: `Subject not found: ${payload.userId}` };
         }
         await repo.delete(userId);
         return { success: true, data: { userId: userId.value } };
      },
   );
}

export function deleteSubjectCommand(input: DeleteSubjectInput) {
   return {
      _type: "command" as const,
      requestName: "DeleteSubject",
      payload: input,
   };
}

export function registerDeleteSubject(repo: IamSubjectRepository) {
   useMediator().registerCommand(createDeleteSubjectHandler(repo));
}
