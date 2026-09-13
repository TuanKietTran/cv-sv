export interface CardRule {
  readonly code: string;
  validate(raw: string): string | null;
}

export interface CardValidatorFailure {
  readonly code: string;
  readonly message: string;
}

/** Card-number rules. Brand-specific length rules can be added independently. */
export class CardFormatRule implements CardRule {
  readonly code = "card-format";
  validate(raw: string): string | null {
    return /^\d{12,19}$/.test(raw)
      ? null
      : "card number must contain between 12 and 19 digits";
  }
}

export class CardLuhnRule implements CardRule {
  readonly code = "card-luhn";
  validate(raw: string): string | null {
    return CardValidator.isLuhnValid(raw) ? null : "invalid card number";
  }
}

export const CARD_NUMBER_RULES: readonly CardRule[] = [
  new CardFormatRule(),
  new CardLuhnRule(),
];

export class CardValidator {
  constructor(private readonly rules: readonly CardRule[] = CARD_NUMBER_RULES) {}

  validate(raw: string): CardValidatorFailure[] {
    return this.rules.flatMap((rule) => {
      const message = rule.validate(raw);
      return message ? [{ code: rule.code, message }] : [];
    });
  }

  static isLuhnValid(value: string): boolean {
    let sum = 0;
    let doubleDigit = false;

    for (let index = value.length - 1; index >= 0; index -= 1) {
      let digit = Number(value[index]);
      if (doubleDigit) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      doubleDigit = !doubleDigit;
    }

    return sum % 10 === 0;
  }
}
