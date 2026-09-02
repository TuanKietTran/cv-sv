import { Subscription } from "./subscription";
import { BillingCycle } from "./billing-cycle";
import { Instant } from "../datetime/instant";

export class SubscriptionService {
   // next billing date = currentPeriodEnd (the moment the next charge is due)
   // returns null when subscription is paused or terminal
   computeNextBillingDate(sub: Subscription, billingCycle: BillingCycle): Instant | null {
      if (sub.status.isPaused || sub.status.isTerminal) return null;
      return sub.currentPeriodEnd.plusMillis(billingCycle.duration.millis);
   }

   isTrialExpired(sub: Subscription, now: Instant): boolean {
      if (!sub.trialEndsAt) return false;
      return !sub.status.isTerminal && now.isAfter(sub.trialEndsAt);
   }

   // true when period has elapsed and subscription should renew
   shouldRenew(sub: Subscription, now: Instant): boolean {
      if (!sub.status.isActive && !sub.status.isPastDue) return false;
      return !now.isBefore(sub.currentPeriodEnd);
   }
}
