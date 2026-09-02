import { ValueObject } from "../value-object";
import type { SocialDateProps } from "./types";

export type { SocialDateProps };

export class SocialDate extends ValueObject<SocialDateProps> {
   constructor(props: SocialDateProps) {
      super(props);
   }

   static of(year: number, month: number, day: number): SocialDate {
      if (!Number.isInteger(year) || year < 1 || year > 9999) {
         throw new Error("year must be integer 1–9999");
      }
      if (!Number.isInteger(month) || month < 1 || month > 12) {
         throw new Error("month must be integer 1–12");
      }
      if (!Number.isInteger(day) || day < 1 || day > 31) {
         throw new Error("day must be integer 1–31");
      }
      if (day > daysInMonth(year, month)) {
         throw new Error(`invalid day ${day} for ${year}-${month}`);
      }
      return new SocialDate({ year, month, day });
   }

   // strict "YYYY-MM-DD" only. no time, no zone.
   static fromISO(iso: string): SocialDate {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
      if (!m) throw new Error(`invalid calendar date: ${iso}`);
      return SocialDate.of(Number(m[1]), Number(m[2]), Number(m[3]));
   }

   // === getters ===

   get year(): number {
      return this.props.year;
   }
   get month(): number {
      return this.props.month;
   }
   get day(): number {
      return this.props.day;
   }

   // === comparison ===

   isBefore(other: SocialDate): boolean {
      return this.compareTo(other) < 0;
   }

   isAfter(other: SocialDate): boolean {
      return this.compareTo(other) > 0;
   }

   private compareTo(other: SocialDate): number {
      if (this.props.year !== other.props.year)
         return this.props.year - other.props.year;
      if (this.props.month !== other.props.month)
         return this.props.month - other.props.month;
      return this.props.day - other.props.day;
   }

   // === arithmetic ===

   plusDays(days: number): SocialDate {
      if (!Number.isInteger(days)) throw new Error("days must be integer");
      const utc = Date.UTC(
         this.props.year,
         this.props.month - 1,
         this.props.day,
      );
      const shifted = new Date(utc + days * 86_400_000);
      return SocialDate.of(
         shifted.getUTCFullYear(),
         shifted.getUTCMonth() + 1,
         shifted.getUTCDate(),
      );
   }

   plusMonths(months: number): SocialDate {
      if (!Number.isInteger(months)) throw new Error("months must be integer");
      const total = this.props.year * 12 + (this.props.month - 1) + months;
      const year = Math.floor(total / 12);
      const month = (total % 12) + 1;
      const day = Math.min(this.props.day, daysInMonth(year, month));
      return SocialDate.of(year, month, day);
   }

   plusYears(years: number): SocialDate {
      return this.plusMonths(years * 12);
   }

   daysUntil(other: SocialDate): number {
      const a = Date.UTC(this.props.year, this.props.month - 1, this.props.day);
      const b = Date.UTC(
         other.props.year,
         other.props.month - 1,
         other.props.day,
      );
      return Math.round((b - a) / 86_400_000);
   }

   // === serialization ===

   toISO(): string {
      const y = String(this.props.year).padStart(4, "0");
      const m = String(this.props.month).padStart(2, "0");
      const d = String(this.props.day).padStart(2, "0");
      return `${y}-${m}-${d}`;
   }

   override toString(): string {
      return this.toISO();
   }
   toJSON(): string {
      return this.toISO();
   }
}

function daysInMonth(year: number, month: number): number {
   if (month === 2) return isLeapYear(year) ? 29 : 28;
   if ([4, 6, 9, 11].includes(month)) return 30;
   return 31;
}

function isLeapYear(year: number): boolean {
   return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
