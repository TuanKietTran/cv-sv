import { ValueObject } from "../value-object";
import type { StatusCode, SubscriptionStatusProps } from "./types";

export type { StatusCode, SubscriptionStatusProps };

// terminal = no further state transitions expected
const TERMINAL: ReadonlySet<StatusCode> = new Set(["cancelled", "expired"]);

// allowed transitions: from → Set<to>
const TRANSITIONS: Record<StatusCode, ReadonlySet<StatusCode>> = {
   trialing: new Set(["active", "cancelled", "expired"]),
   active: new Set(["past_due", "paused", "cancelled", "expired"]),
   past_due: new Set(["active", "cancelled", "expired"]),
   paused: new Set(["active", "cancelled", "expired"]),
   cancelled: new Set(),
   expired: new Set(),
};

export class SubscriptionStatus extends ValueObject<SubscriptionStatusProps> {
   constructor(props: SubscriptionStatusProps) {
      super(props);
   }

   static of(code: StatusCode): SubscriptionStatus {
      if (!(code in TRANSITIONS)) {
         throw new Error(`unknown status: ${code}`);
      }
      return new SubscriptionStatus({ code });
   }

   static readonly TRIALING = new SubscriptionStatus({ code: "trialing" });
   static readonly ACTIVE = new SubscriptionStatus({ code: "active" });
   static readonly PAST_DUE = new SubscriptionStatus({ code: "past_due" });
   static readonly PAUSED = new SubscriptionStatus({ code: "paused" });
   static readonly CANCELLED = new SubscriptionStatus({ code: "cancelled" });
   static readonly EXPIRED = new SubscriptionStatus({ code: "expired" });

   get code(): StatusCode {
      return this.props.code;
   }

   get isActive(): boolean {
      return this.props.code === "active";
   }
   get isTrialing(): boolean {
      return this.props.code === "trialing";
   }
   get isPastDue(): boolean {
      return this.props.code === "past_due";
   }
   get isPaused(): boolean {
      return this.props.code === "paused";
   }
   get isCancelled(): boolean {
      return this.props.code === "cancelled";
   }
   get isExpired(): boolean {
      return this.props.code === "expired";
   }
   get isTerminal(): boolean {
      return TERMINAL.has(this.props.code);
   }

   // whether subscription grants access to content
   get hasAccess(): boolean {
      return this.props.code === "active" || this.props.code === "trialing";
   }

   transitionTo(next: StatusCode): SubscriptionStatus {
      const allowed = TRANSITIONS[this.props.code];
      if (!allowed.has(next)) {
         throw new Error(`invalid transition: ${this.props.code} → ${next}`);
      }
      return SubscriptionStatus.of(next);
   }

   override toString(): string {
      return this.props.code;
   }
   toJSON(): string {
      return this.props.code;
   }
}
