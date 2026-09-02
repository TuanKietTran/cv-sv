import { ValueObject } from "../value-object";
import type { UserIdProps } from "./types";

export type { UserIdProps };

export class UserId extends ValueObject<UserIdProps> {
   constructor(props: UserIdProps) {
      super(props);
   }

   static of(id: string): UserId {
      if (!id || !id.trim()) throw new Error("UserId must not be empty");
      return new UserId({ value: id.trim() });
   }

   get value(): string {
      return this.props.value;
   }
   override toString(): string {
      return this.props.value;
   }
   toJSON(): string {
      return this.props.value;
   }
}
