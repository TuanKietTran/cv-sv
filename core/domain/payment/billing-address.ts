import { ValueObject } from "../value-object";
import type { CountryTextCode } from "../phone/country-code";

export interface BillingAddressProps {
  line1: string;
  line2?: string;
  city: string;
  stateOrProvince?: string;
  postalCode: string;
  country: CountryTextCode;
}

export class BillingAddress extends ValueObject<BillingAddressProps> {
  constructor(props: BillingAddressProps) {
    super(props);
  }

  static create(props: BillingAddressProps): BillingAddress {
    const line1 = props.line1.trim();
    const city = props.city.trim();
    const postalCode = props.postalCode.trim();

    if (!line1) throw new Error("billing address line1 must not be empty");
    if (!city) throw new Error("billing address city must not be empty");
    if (!postalCode) throw new Error("billing address postal code must not be empty");

    return new BillingAddress({
      ...props,
      line1,
      line2: props.line2?.trim() || undefined,
      city,
      stateOrProvince: props.stateOrProvince?.trim() || undefined,
      postalCode,
    });
  }

  get line1(): string { return this.props.line1; }
  get line2(): string | undefined { return this.props.line2; }
  get city(): string { return this.props.city; }
  get stateOrProvince(): string | undefined { return this.props.stateOrProvince; }
  get postalCode(): string { return this.props.postalCode; }
  get country(): CountryTextCode { return this.props.country; }

  toJSON(): BillingAddressProps {
    return { ...this.props };
  }
}
