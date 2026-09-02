import { createHandler, useMediator } from "../cqrs";
import type { UserRepository } from "../repos/user.repo";

export interface GetUserInput {
  userId: string;
}

export interface GetUserOutput {
  id: string;
  email: string;
}

export function createGetUserHandler(repo: UserRepository) {
  return createHandler<GetUserInput, GetUserOutput>(
    "GetUser",
    async (payload) => {
      const stored = await repo.findById(payload.userId);
      if (!stored) {
        return { success: false, error: "User not found" };
      }
      return { success: true, data: { id: stored.id, email: stored.email } };
    },
  );
}

export function getUserQuery(input: GetUserInput) {
  return {
    _type: "query" as const,
    requestName: "GetUser",
    payload: input,
  };
}

export function registerGetUser(repo: UserRepository) {
  useMediator().registerQuery(createGetUserHandler(repo));
}
