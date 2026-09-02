import { createHandler, useMediator } from "../cqrs";
import { PlainPassword, HashedPassword } from "../domain/iam";
import type { PasswordHasher } from "../domain/iam";
import type { UserRepository } from "../repos/user.repo";

export interface LoginUserInput {
   email: string;
   password: string;
}

export interface LoginUserOutput {
   userId: string;
}

export function createLoginUserHandler(
   repo: UserRepository,
   hasher: PasswordHasher,
) {
   return createHandler<LoginUserInput, LoginUserOutput>(
      "LoginUser",
      async (payload) => {
         const stored = await repo.findByEmail(
            payload.email.trim().toLowerCase(),
         );
         if (!stored) {
            return { success: false, error: "Invalid email or password" };
         }

         const plain = new PlainPassword({ value: payload.password });
         const hashed = HashedPassword.fromPersistentHash(stored.passwordHash);
         const valid = await hasher.verify(plain, hashed);
         if (!valid) {
            return { success: false, error: "Invalid email or password" };
         }

         return { success: true, data: { userId: stored.id } };
      },
   );
}

export function loginUserCommand(input: LoginUserInput) {
   return {
      _type: "command" as const,
      requestName: "LoginUser",
      payload: input,
   };
}

export function registerLoginUser(
   repo: UserRepository,
   hasher: PasswordHasher,
) {
   useMediator().registerCommand(createLoginUserHandler(repo, hasher));
}
