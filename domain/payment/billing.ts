import { ValueObject } from "../value-object";
import { Email } from "../iam/email";
import { PhoneNumber } from "../phone/phone";
import { BillingAddress } from "./billing-address";

export interface BillingProps {
  fullName: string;
  address: BillingAddress;
  email?: Email;
  phone?: PhoneNumber;
}

/** Complete billing information, excluding payment-card data. */
export class Billing extends ValueObject<BillingProps> {
  constructor(props: BillingProps) {
    super(props);
  }

  static create(props: BillingProps): Billing {
    const fullName = props.fullName.trim();
    if (!fullName) throw new Error("billing full name must not be empty");

    return new Billing({ ...props, fullName });
  }

  get fullName(): string { return this.props.fullName; }
  get address(): BillingAddress { return this.props.address; }
  get email(): Email | undefined { return this.props.email; }
  get phone(): PhoneNumber | undefined { return this.props.phone; }

  toJSON(): BillingProps {
    return { ...this.props };
  }
}

export { Billing as BillingInfo };
