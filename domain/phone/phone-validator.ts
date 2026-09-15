
import { COUNTRY_CALLING_CODES, type CountryCode, type CountryTextCode } from "./country-code";

export interface PhoneRule {
   readonly code: string;
   validate(raw: string): string | null;
}

export interface PhoneValidatorFailure {
   code: string;
   message: string;
}

export class RequiredPhoneRule implements PhoneRule {
   readonly code = "phone-required";
   validate(raw: string): string | null {
      return raw.trim() ? null : "phone number must not be empty";
   }
}

export class PhoneCharactersRule implements PhoneRule {
   readonly code = "phone-characters";
   validate(raw: string): string | null {
      return /^[+0-9(). -]+$/.test(raw.trim())
         ? null : "phone number contains invalid characters";
   }
}

export class PhoneLengthRule implements PhoneRule {
   readonly code = "phone-length";
   validate(raw: string): string | null {
      const digits = PhoneValidator.normalize(raw);
      return digits.length >= 4 && digits.length <= 15
         ? null : "phone number must contain between 4 and 15 digits";
   }
}

export class CountryCallingCodeRule implements PhoneRule {
   readonly code = "country-calling-code";
   constructor(private readonly countryCode: CountryCode) {}

   validate(_raw: string): string | null {
      const [country, callingCode] = this.countryCode;
      return COUNTRY_CALLING_CODES[country] === callingCode
         ? null : `invalid calling code for country: ${country}`;
   }
}

/** Detailed local-number rules are intentionally limited to these regions for now. */
export class UsPhoneRule implements PhoneRule {
   readonly code = "us-format";
   validate(raw: string): string | null {
      return /^(?:[2-9]\d{2})(?:[2-9]\d{2})\d{4}$/.test(raw)
         ? null : "invalid US phone number";
   }
}

export class VietnamPhoneRule implements PhoneRule {
   readonly code = "vn-format";
   validate(raw: string): string | null {
      return /^(?:0[35789]\d{8}|2\d{9})$/.test(raw)
         ? null : "invalid Vietnam phone number";
   }
}

export class JapanPhoneRule implements PhoneRule {
   readonly code = "jp-format";
   validate(raw: string): string | null {
      return /^(?:0[789]0\d{8}|0\d{9,10})$/.test(raw)
         ? null : "invalid Japan phone number";
   }
}

export class FrancePhoneRule implements PhoneRule {
   readonly code = "fr-format";
   validate(raw: string): string | null {
      return /^[1-9]\d{8}$/.test(raw)
         ? null : "invalid France phone number";
   }
}

export class GermanyPhoneRule implements PhoneRule {
   readonly code = "de-format";
   validate(raw: string): string | null {
      return /^\d{5,11}$/.test(raw)
         ? null : "invalid Germany phone number";
   }
}

export class SpainPhoneRule implements PhoneRule {
   readonly code = "es-format";
   validate(raw: string): string | null {
      return /^[6789]\d{8}$/.test(raw)
         ? null : "invalid Spain phone number";
   }
}

export const PHONE_NUMBER_RULES: Partial<Record<CountryTextCode, PhoneRule>> = {
   US: new UsPhoneRule(),
   VN: new VietnamPhoneRule(),
   JP: new JapanPhoneRule(),
   FR: new FrancePhoneRule(),
   DE: new GermanyPhoneRule(),
   ES: new SpainPhoneRule(),
};

export class PhoneValidator {
   constructor(private readonly rules: ReadonlyArray<PhoneRule> = []) {}

   validate(raw: string, countryCode: CountryCode): PhoneValidatorFailure[] {
      const country = countryCode[0];
      const rules = [
         new RequiredPhoneRule(),
         new PhoneCharactersRule(),
         new PhoneLengthRule(),
         new CountryCallingCodeRule(countryCode),
         ...this.rules,
         ...(PHONE_NUMBER_RULES[country] ? [PHONE_NUMBER_RULES[country]] : []),
      ];

      const normalized = PhoneValidator.normalize(raw);
      return rules.flatMap((rule) => {
         // Syntax rules inspect the original input; number rules inspect digits.
         const input = rule instanceof PhoneCharactersRule || rule instanceof RequiredPhoneRule
            ? raw : normalized;
         const message = rule.validate(input);
         return message ? [{ code: rule.code, message }] : [];
      });
   }

   static normalize(raw: string): string {
      return raw.trim().replace(/\D/g, "");
   }
}