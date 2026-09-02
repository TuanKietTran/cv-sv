import { ValueObject } from "../value-object";

export interface PlainPasswordProps {
   value: string;
}

export interface HashedPasswordProps {
   hash: string;
}

export class PlainPassword extends ValueObject<PlainPasswordProps> {
   constructor(props: PlainPasswordProps) {
      super(props);
   }

   static create(raw: string, validator: PasswordValidator): PlainPassword {
      const failures = validator.validate(raw);
      if (failures.length > 0) {
         throw new WeakPasswordError(failures);
      }
      return new PlainPassword({ value: raw });
   }

   get value(): string {
      return this.props.value;
   }

   override toString(): string {
      return "[REDACTED]";
   }

   toJSON(): string {
      return "[REDACTED]";
   }
}

export class HashedPassword extends ValueObject<HashedPasswordProps> {
   constructor(props: HashedPasswordProps) {
      super(props);
   }

   static fromHash(hash: string): HashedPassword {
      if (!hash) {
         throw new Error("hash must be provided");
      }
      return new HashedPassword({ hash });
   }

   static fromPersistentHash(hash: string): HashedPassword {
      if (!hash) {
         throw new Error("hash must be provided");
      }
      return new HashedPassword({ hash });
   }

   get hash(): string {
      return this.props.hash;
   }

   override toString(): string {
      return "[REDACTED]";
   }

   toJSON(): string {
      return "[REDACTED]";
   }
}

export class WeakPasswordError extends Error {
   constructor(public readonly failures: ReadonlyArray<ValidatorFailure>) {
      super(
         `password invalid: ${failures.map((f) => `${f.code}: ${f.message}`).join(", ")}`,
      );
      this.name = "WeakPasswordError";
   }
}

export interface PasswordHasher {
   hash(plain: PlainPassword): PromiseLike<HashedPassword>;
   verify(plain: PlainPassword, hashed: HashedPassword): PromiseLike<boolean>;
}

interface PasswordRule {
   readonly code: string;
   validate(raw: string): string | null;
}

export interface ValidatorFailure {
   code: string;
   message: string;
}

export class PasswordValidator {
   constructor(private readonly rules: ReadonlyArray<PasswordRule>) {}

   validate(raw: string): ValidatorFailure[] {
      const errors: ValidatorFailure[] = [];
      for (const rule of this.rules) {
         const result = rule.validate(raw);
         if (result) {
            errors.push({ code: rule.code, message: result });
         }
      }
      return errors;
   }
}

export class MinLengthRule implements PasswordRule {
   readonly code = "min-length";
   constructor(private readonly minLength: number) {}

   validate(raw: string): string | null {
      if (raw.length < this.minLength) {
         return (
            "password must be at least " + this.minLength + " characters long"
         );
      }
      return null;
   }
}

export class HasUppercaseRule implements PasswordRule {
   readonly code = "has-uppercase";

   validate(raw: string): string | null {
      if (!/[A-Z]/.test(raw)) {
         return "password must contain at least one uppercase letter";
      }
      return null;
   }
}

export class HasDigitRule implements PasswordRule {
   readonly code = "has-digit";

   validate(raw: string): string | null {
      if (!/[0-9]/.test(raw)) {
         return "password must contain at least one digit";
      }
      return null;
   }
}

export class HasSpecialCharRule implements PasswordRule {
   readonly code = "has-special-char";

   validate(raw: string): string | null {
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(raw)) {
         return "password must contain at least one special character";
      }
      return null;
   }
}

export class NotCommonRule implements PasswordRule {
   readonly code = "not-common";

   constructor(private readonly blacklists: ReadonlySet<string>) {}

   validate(raw: string): string | null {
      if (this.blacklists.has(raw)) {
         return "password is too common";
      }
      return null;
   }
}
