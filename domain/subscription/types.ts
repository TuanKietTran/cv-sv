// ── Type aliases ────────────────────────────────────────────────────────────

/** ISO 4217 currency codes supported by this system. */
export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "SGD" | "VND";

export type BillingPeriod = "weekly" | "monthly" | "quarterly" | "biannual" | "yearly";

export type StatusCode = "trialing" | "active" | "past_due" | "paused" | "cancelled" | "expired";

// ── Props interfaces ─────────────────────────────────────────────────────────

export interface MoneyProps {
   amountMinor: number;
   currency: CurrencyCode;
}

export interface BillingCycleProps {
   period: BillingPeriod;
}

export interface SubscriptionStatusProps {
   code: StatusCode;
}

export interface SubscriptionIdProps {
   value: string;
}
