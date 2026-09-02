import { createHandler, useMediator } from "../cqrs";
import { Email } from "../domain/iam";
import { PlainPassword, HashedPassword } from "../domain/iam";
import type { PasswordHasher } from "../domain/iam";
import type { UserRepository } from "../repos/user.repo";

export interface RegisterUserInput {
   email: string;
   password: string;
}

export interface RegisterUserOutput {
   userId: string;
}

export function createRegisterUserHandler(
   repo: UserRepository,
   hasher: PasswordHasher,
) {
   return createHandler<RegisterUserInput, RegisterUserOutput>(
      "RegisterUser",
      async (payload) => {
         const email = Email.create(payload.email);
         const plain = new PlainPassword({ value: payload.password });
         const hashed = await hasher.hash(plain);

         const existing = await repo.findByEmail(email.value);
         if (existing) {
            return { success: false, error: "Email already registered" };
         }

         const id = crypto.randomUUID();
         await repo.save({
            id,
            email: email.value,
            passwordHash: hashed.hash,
            createdAt: new Date().toISOString(),
         });

         return { success: true, data: { userId: id } };
      },
   );
}

export function registerUserCommand(input: RegisterUserInput) {
   return {
      _type: "command" as const,
      requestName: "RegisterUser",
      payload: input,
   };
}

export function registerRegisterUser(
   repo: UserRepository,
   hasher: PasswordHasher,
) {
   useMediator().registerCommand(createRegisterUserHandler(repo, hasher));
}
