import { ValueObject } from "../value-object";
import { CardValidator } from "./card-validator";

export type CardBrand = "visa" | "mastercard" | "american-express" | "discover" | "other";

export interface CardNumberProps {
  value: string;
}

/** A normalized, Luhn-valid credit/debit card number. */
export class CardNumber extends ValueObject<CardNumberProps> {
  constructor(props: CardNumberProps) {
    super(props);
  }

  static create(raw: string): CardNumber {
    const value = raw.replace(/[ -]/g, "");
    const failures = new CardValidator().validate(value);
    if (failures.length > 0) {
      throw new Error(failures.map(({ message }) => message).join("; "));
    }
    return new CardNumber({ value });
  }

  get value(): string {
    return this.props.value;
  }

  get brand(): CardBrand {
    if (/^4/.test(this.value)) return "visa";
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]))/.test(this.value)) return "mastercard";
    if (/^3[47]/.test(this.value)) return "american-express";
    if (/^(6011|65|64[4-9])/.test(this.value)) return "discover";
    return "other";
  }

  /** Only the last four digits are exposed for display. */
  get lastFour(): string {
    return this.value.slice(-4);
  }

  override toString(): string {
    return `****${this.lastFour}`;
  }

  toJSON(): { brand: CardBrand; lastFour: string } {
    return { brand: this.brand, lastFour: this.lastFour };
  }
}
