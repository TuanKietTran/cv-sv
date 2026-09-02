import { ValueObject } from "../value-object";
import { PlanId } from "./plan-id";
import { Money } from "../subscription/money";
import { BillingCycle } from "../subscription/billing-cycle";
import { Duration } from "../datetime/duration";

export type PlanSource = "user" | "catalog";

interface PlanProps {
   id: PlanId;
   name: string;
   description: string;
   provider: string;
   source: PlanSource;
   createdBy: string | null;
   price: Money;
   billingCycle: BillingCycle;
   trialDuration: Duration | null;
   features: ReadonlyArray<string>;
   isPublic: boolean;
}

export class Plan extends ValueObject<PlanProps> {
   constructor(props: PlanProps) {
      super(props);
   }

   static create(params: {
      id: string;
      name: string;
      description: string;
      provider?: string;
      source?: PlanSource;
      createdBy?: string | null;
      price: Money;
      billingCycle: BillingCycle;
      trialDuration?: Duration;
      features?: string[];
      isPublic?: boolean;
   }): Plan {
      const name = params.name.trim();
      if (!name) throw new Error("Plan name must not be empty");
      if (name.length > 100) throw new Error("Plan name must be ≤ 100 characters");

      return new Plan({
         id: PlanId.of(params.id),
         name,
         description: params.description.trim(),
         provider: params.provider?.trim() ?? "",
         source: params.source ?? "catalog",
         createdBy: params.createdBy ?? null,
         price: params.price,
         billingCycle: params.billingCycle,
         trialDuration: params.trialDuration ?? null,
         features: Object.freeze(params.features?.map(f => f.trim()).filter(Boolean) ?? []),
         isPublic: params.isPublic ?? true,
      });
   }

   get id(): PlanId { return this.props.id; }
   get name(): string { return this.props.name; }
   get description(): string { return this.props.description; }
   get provider(): string { return this.props.provider; }
   get source(): PlanSource { return this.props.source; }
   get createdBy(): string | null { return this.props.createdBy; }
   get isUserPlan(): boolean { return this.props.source === "user"; }
   get price(): Money { return this.props.price; }
   get billingCycle(): BillingCycle { return this.props.billingCycle; }
   get trialDuration(): Duration | null { return this.props.trialDuration; }
   get features(): ReadonlyArray<string> { return this.props.features; }
   get isPublic(): boolean { return this.props.isPublic; }

   get hasTrial(): boolean { return this.props.trialDuration !== null; }

   // annualised cost for cross-billing-cycle comparison
   get annualCost(): Money {
      return this.props.price.multiply(this.props.billingCycle.annualFrequency);
   }

   withPrice(price: Money): Plan {
      return new Plan({ ...this.props, price });
   }

   withFeatures(features: string[]): Plan {
      return new Plan({
         ...this.props,
         features: Object.freeze(features.map(f => f.trim()).filter(Boolean)),
      });
   }

   toJSON() {
      return {
         id: this.props.id.toJSON(),
         name: this.props.name,
         description: this.props.description,
         provider: this.props.provider,
         source: this.props.source,
         createdBy: this.props.createdBy,
         price: this.props.price.toJSON(),
         billingCycle: this.props.billingCycle.toJSON(),
         trialDays: this.props.trialDuration?.days ?? null,
         features: [...this.props.features],
         isPublic: this.props.isPublic,
      };
   }

   static fromJSON(data: ReturnType<Plan["toJSON"]>): Plan {
      return Plan.create({
         id: data.id,
         name: data.name,
         description: data.description,
         provider: data.provider,
         source: data.source,
         createdBy: data.createdBy,
         price: Money.of(data.price.amountMinor, data.price.currency),
         billingCycle: BillingCycle.of(data.billingCycle as any),
         trialDuration: data.trialDays != null ? Duration.fromDays(data.trialDays) : undefined,
         features: [...data.features],
         isPublic: data.isPublic,
      });
   }
}
