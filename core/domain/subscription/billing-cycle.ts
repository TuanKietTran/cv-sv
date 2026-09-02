import { ValueObject } from "../value-object";
import { Duration } from "../datetime/duration";
import type { BillingPeriod, BillingCycleProps } from "./types";

export type { BillingPeriod, BillingCycleProps };

const PERIOD_DURATIONS: Record<BillingPeriod, Duration> = {
   weekly: Duration.fromDays(7),
   monthly: Duration.fromDays(30),
   quarterly: Duration.fromDays(91),
   biannual: Duration.fromDays(182),
   yearly: Duration.fromDays(365),
};

export class BillingCycle extends ValueObject<BillingCycleProps> {
   constructor(props: BillingCycleProps) {
      super(props);
   }

   static of(period: BillingPeriod): BillingCycle {
      if (!(period in PERIOD_DURATIONS)) {
         throw new Error(`unknown billing period: ${period}`);
      }
      return new BillingCycle({ period });
   }

   static readonly WEEKLY = new BillingCycle({ period: "weekly" });
   static readonly MONTHLY = new BillingCycle({ period: "monthly" });
   static readonly QUARTERLY = new BillingCycle({ period: "quarterly" });
   static readonly BIANNUAL = new BillingCycle({ period: "biannual" });
   static readonly YEARLY = new BillingCycle({ period: "yearly" });

   get period(): BillingPeriod {
      return this.props.period;
   }

   // nominal duration — approximation, not calendar-exact
   get duration(): Duration {
      return PERIOD_DURATIONS[this.props.period];
   }

   // how many times this cycle fits into a year (for annual price comparison)
   get annualFrequency(): number {
      return Duration.fromDays(365).millis / this.duration.millis;
   }

   override toString(): string {
      return this.props.period;
   }
   toJSON(): string {
      return this.props.period;
   }
}
