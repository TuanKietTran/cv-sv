import { ValueObject } from "../value-object";
import type { CurrencyCode, MoneyProps } from "./types";

export type { CurrencyCode, MoneyProps };

// minor-unit multipliers (JPY + VND have no subunit)
const MINOR_UNITS: Record<CurrencyCode, number> = {
   USD: 100,
   EUR: 100,
   GBP: 100,
   AUD: 100,
   CAD: 100,
   SGD: 100,
   JPY: 1,
   VND: 1,
};

export class Money extends ValueObject<MoneyProps> {
   constructor(props: MoneyProps) {
      super(props);
   }

   static of(amountMinor: number, currency: CurrencyCode): Money {
      if (!Number.isInteger(amountMinor) || amountMinor < 0) {
         throw new Error("amountMinor must be non-negative integer");
      }
      return new Money({ amountMinor, currency });
   }

   // convenience: pass human amount, e.g. Money.fromMajor(9.99, "USD") → 999
   static fromMajor(amount: number, currency: CurrencyCode): Money {
      const factor = MINOR_UNITS[currency];
      const minor = Math.round(amount * factor);
      return Money.of(minor, currency);
   }

   get amountMinor(): number {
      return this.props.amountMinor;
   }
   get currency(): CurrencyCode {
      return this.props.currency;
   }

   get amountMajor(): number {
      return this.props.amountMinor / MINOR_UNITS[this.props.currency];
   }

   add(other: Money): Money {
      this.assertSameCurrency(other);
      return Money.of(
         this.props.amountMinor + other.props.amountMinor,
         this.props.currency,
      );
   }

   multiply(factor: number): Money {
      if (!Number.isFinite(factor) || factor < 0) {
         throw new Error("factor must be non-negative finite number");
      }
      return Money.of(
         Math.round(this.props.amountMinor * factor),
         this.props.currency,
      );
   }

   isZero(): boolean {
      return this.props.amountMinor === 0;
   }

   isGreaterThan(other: Money): boolean {
      this.assertSameCurrency(other);
      return this.props.amountMinor > other.props.amountMinor;
   }

   private assertSameCurrency(other: Money): void {
      if (this.props.currency !== other.props.currency) {
         throw new Error(
            `currency mismatch: ${this.props.currency} vs ${other.props.currency}`,
         );
      }
   }

   override toString(): string {
      return `${this.amountMajor.toFixed(MINOR_UNITS[this.props.currency] === 1 ? 0 : 2)} ${this.props.currency}`;
   }

   toJSON(): { amountMinor: number; currency: CurrencyCode } {
      return {
         amountMinor: this.props.amountMinor,
         currency: this.props.currency,
      };
   }
}
