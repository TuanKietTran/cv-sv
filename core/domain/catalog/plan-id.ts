import { ValueObject } from "../value-object";
import type { PlanIdProps } from "./types";

export type { PlanIdProps };

export class PlanId extends ValueObject<PlanIdProps> {
   constructor(props: PlanIdProps) {
      super(props);
   }

   static of(id: string): PlanId {
      if (!id || !id.trim()) throw new Error("PlanId must not be empty");
      return new PlanId({ value: id.trim() });
   }

   get value(): string { return this.props.value; }
   override toString(): string { return this.props.value; }
   toJSON(): string { return this.props.value; }
}
