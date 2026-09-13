import { ValueObject } from "../value-object";
import type { CountryCode } from "./country-code";
import { PhoneValidator } from "./phone-validator";

export type { CountryCode, CountryTextCode } from "./country-code";

export interface PhoneNumberProps {
  value: string;
  countryCode: CountryCode;
}

export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  constructor(props: PhoneNumberProps) {
    super(props);
  }

  static create(props: PhoneNumberProps): PhoneNumber {
    const failures = new PhoneValidator().validate(props.value, props.countryCode);
    if (failures.length > 0) {
      throw new Error(failures.map(({ message }) => message).join("; "));
    }

    return new PhoneNumber({
      value: PhoneValidator.normalize(props.value),
      countryCode: props.countryCode,
    });
  }

  static of(value: string, countryCode: CountryCode): PhoneNumber {
    return PhoneNumber.create({ value, countryCode });
  }

  get value(): string {
    return this.props.value;
  }

  get countryCode(): CountryCode {
    return this.props.countryCode;
  }

  get internationalValue(): string {
    return `+${this.countryCode[1]}${this.value}`;
  }

  override toString(): string {
    return this.internationalValue;
  }

  toJSON(): PhoneNumberProps {
    return {
      value: this.value,
      countryCode: this.countryCode,
    };
  }
}

