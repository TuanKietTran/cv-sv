import { ValueObject } from "../value-object";
import { PlanId } from "../catalog/plan-id";
import { SubscriptionStatus } from "./subscription-status";
import { Instant } from "../datetime/instant";
import { Duration } from "../datetime/duration";
import type { SubscriptionIdProps } from "./types";

export type { SubscriptionIdProps };

export class SubscriptionId extends ValueObject<SubscriptionIdProps> {
   constructor(props: SubscriptionIdProps) {
      super(props);
   }

   static of(id: string): SubscriptionId {
      if (!id || !id.trim())
         throw new Error("SubscriptionId must not be empty");
      return new SubscriptionId({ value: id.trim() });
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

interface SubscriptionProps {
   id: SubscriptionId;
   userId: string;
   planId: PlanId;
   status: SubscriptionStatus;
   startedAt: Instant;
   currentPeriodStart: Instant;
   currentPeriodEnd: Instant;
   trialEndsAt: Instant | null;
   cancelledAt: Instant | null;
   pausedAt: Instant | null;
   // plan to switch to at the start of the next billing interval
   nextIntervalPlanId: PlanId | null;
}

export class Subscription extends ValueObject<SubscriptionProps> {
   constructor(props: SubscriptionProps) {
      super(props);
   }

   static create(params: {
      id: string;
      userId: string;
      planId: string;
      startAt: Instant;
      periodEnd: Instant;
      trialDuration?: Duration;
   }): Subscription {
      if (!params.userId.trim()) throw new Error("userId must not be empty");

      const hasTrial =
         params.trialDuration != null && params.trialDuration.millis > 0;
      const trialEndsAt = hasTrial
         ? params.startAt.plusMillis(params.trialDuration!.millis)
         : null;
      const initialStatus = hasTrial
         ? SubscriptionStatus.TRIALING
         : SubscriptionStatus.ACTIVE;

      return new Subscription({
         id: SubscriptionId.of(params.id),
         userId: params.userId.trim(),
         planId: PlanId.of(params.planId),
         status: initialStatus,
         startedAt: params.startAt,
         currentPeriodStart: params.startAt,
         currentPeriodEnd: params.periodEnd,
         trialEndsAt,
         cancelledAt: null,
         pausedAt: null,
         nextIntervalPlanId: null,
      });
   }

   // === getters ===

   get id(): SubscriptionId {
      return this.props.id;
   }
   get userId(): string {
      return this.props.userId;
   }
   get planId(): PlanId {
      return this.props.planId;
   }
   get status(): SubscriptionStatus {
      return this.props.status;
   }
   get startedAt(): Instant {
      return this.props.startedAt;
   }
   get currentPeriodStart(): Instant {
      return this.props.currentPeriodStart;
   }
   get currentPeriodEnd(): Instant {
      return this.props.currentPeriodEnd;
   }
   get trialEndsAt(): Instant | null {
      return this.props.trialEndsAt;
   }
   get cancelledAt(): Instant | null {
      return this.props.cancelledAt;
   }
   get pausedAt(): Instant | null {
      return this.props.pausedAt;
   }
   get nextIntervalPlanId(): PlanId | null {
      return this.props.nextIntervalPlanId;
   }

   get hasPendingPlanChange(): boolean {
      return this.props.nextIntervalPlanId !== null;
   }

   // === computed ===

   isInTrial(now: Instant): boolean {
      if (!this.props.trialEndsAt) return false;
      return (
         this.props.status.isTrialing && now.isBefore(this.props.trialEndsAt)
      );
   }

   isAccessGranted(): boolean {
      return this.props.status.hasAccess;
   }

   // === state transitions — all return new Subscription ===

   activate(): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("active"),
      });
   }

   cancel(at: Instant): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("cancelled"),
         cancelledAt: at,
      });
   }

   pause(at: Instant): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("paused"),
         pausedAt: at,
      });
   }

   resume(): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("active"),
         pausedAt: null,
      });
   }

   expire(): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("expired"),
      });
   }

   markPastDue(): Subscription {
      return new Subscription({
         ...this.props,
         status: this.props.status.transitionTo("past_due"),
      });
   }

   // Schedule a plan switch for the start of the next billing interval.
   // Overwrites any previously scheduled change.
   schedulePlanChange(newPlanId: PlanId): Subscription {
      if (this.props.status.isTerminal) {
         throw new Error(
            "Cannot schedule plan change on a terminal subscription",
         );
      }
      if (newPlanId.equals(this.props.planId)) {
         throw new Error("New plan must differ from current plan");
      }
      return new Subscription({ ...this.props, nextIntervalPlanId: newPlanId });
   }

   // Remove a previously scheduled plan change.
   cancelPlanChange(): Subscription {
      if (!this.props.nextIntervalPlanId) {
         throw new Error("No pending plan change to cancel");
      }
      return new Subscription({ ...this.props, nextIntervalPlanId: null });
   }

   renew(at: Instant, newPeriodEnd: Instant): Subscription {
      // apply any pending plan change atomically on renewal
      const planId = this.props.nextIntervalPlanId ?? this.props.planId;
      return new Subscription({
         ...this.props,
         planId,
         nextIntervalPlanId: null,
         currentPeriodStart: at,
         currentPeriodEnd: newPeriodEnd,
         // re-activate if past_due on successful renewal
         status: this.props.status.isPastDue
            ? SubscriptionStatus.ACTIVE
            : this.props.status,
      });
   }

   toJSON() {
      return {
         id: this.props.id.toJSON(),
         userId: this.props.userId,
         planId: this.props.planId.toJSON(),
         status: this.props.status.toJSON(),
         startedAt: this.props.startedAt.toJSON(),
         currentPeriodStart: this.props.currentPeriodStart.toJSON(),
         currentPeriodEnd: this.props.currentPeriodEnd.toJSON(),
         trialEndsAt: this.props.trialEndsAt?.toJSON() ?? null,
         cancelledAt: this.props.cancelledAt?.toJSON() ?? null,
         pausedAt: this.props.pausedAt?.toJSON() ?? null,
         nextIntervalPlanId: this.props.nextIntervalPlanId?.toJSON() ?? null,
      };
   }

   static fromJSON(data: ReturnType<Subscription["toJSON"]>): Subscription {
      return new Subscription({
         id: SubscriptionId.of(data.id),
         userId: data.userId,
         planId: PlanId.of(data.planId),
         status: SubscriptionStatus.of(data.status as any),
         startedAt: Instant.fromISO(data.startedAt),
         currentPeriodStart: Instant.fromISO(data.currentPeriodStart),
         currentPeriodEnd: Instant.fromISO(data.currentPeriodEnd),
         trialEndsAt: data.trialEndsAt
            ? Instant.fromISO(data.trialEndsAt)
            : null,
         cancelledAt: data.cancelledAt
            ? Instant.fromISO(data.cancelledAt)
            : null,
         pausedAt: data.pausedAt ? Instant.fromISO(data.pausedAt) : null,
         nextIntervalPlanId: data.nextIntervalPlanId
            ? PlanId.of(data.nextIntervalPlanId)
            : null,
      });
   }
}
