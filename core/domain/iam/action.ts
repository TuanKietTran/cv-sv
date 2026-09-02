import { ValueObject } from "../value-object";
import type { ActionCode, ActionProps } from "./types";

export type { ActionCode, ActionProps };

const ALL_CODES: ReadonlySet<ActionCode> = new Set([
   "subscription:read",
   "subscription:write",
   "subscription:cancel",
   "subscription:pause",
   "subscription:resume",
   "subscription:renew",
   "iam:read",
   "iam:write",
]);

export class Action extends ValueObject<ActionProps> {
   constructor(props: ActionProps) {
      super(props);
   }

   static of(code: ActionCode): Action {
      if (!ALL_CODES.has(code)) throw new Error(`Unknown action code: ${code}`);
      return new Action({ code });
   }

   // static singletons
   static readonly SUBSCRIPTION_READ = new Action({
      code: "subscription:read",
   });
   static readonly SUBSCRIPTION_WRITE = new Action({
      code: "subscription:write",
   });
   static readonly SUBSCRIPTION_CANCEL = new Action({
      code: "subscription:cancel",
   });
   static readonly SUBSCRIPTION_PAUSE = new Action({
      code: "subscription:pause",
   });
   static readonly SUBSCRIPTION_RESUME = new Action({
      code: "subscription:resume",
   });
   static readonly SUBSCRIPTION_RENEW = new Action({
      code: "subscription:renew",
   });
   static readonly IAM_READ = new Action({ code: "iam:read" });
   static readonly IAM_WRITE = new Action({ code: "iam:write" });

   get code(): ActionCode {
      return this.props.code;
   }

   /** True if this action is a read-only operation (ends with ":read"). */
   isReadOnly(): boolean {
      return this.props.code.endsWith(":read");
   }

   override toString(): string {
      return this.props.code;
   }
   toJSON(): string {
      return this.props.code;
   }
}
