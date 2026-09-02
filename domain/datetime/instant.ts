import { ValueObject } from "../value-object";
import type { InstantProps } from "./types";

export type { InstantProps };

export class Instant extends ValueObject<InstantProps> {
   constructor(props: InstantProps) {
      super(props);
   }

   static now(): Instant {
      return new Instant({ epochMillis: Date.now() });
   }

   static fromEpochMillis(ms: number): Instant {
      if (!Number.isFinite(ms) || !Number.isInteger(ms)) {
         throw new Error("epochMillis must be finite integer");
      }
      return new Instant({ epochMillis: ms });
   }

   static fromEpochSeconds(s: number): Instant {
      if (!Number.isFinite(s)) throw new Error("seconds must be finite");
      return new Instant({ epochMillis: Math.trunc(s * 1000) });
   }

   // ISO 8601 with explicit offset or Z. rejects ambiguous strings.
   static fromISO(iso: string): Instant {
      if (typeof iso !== "string") throw new Error("iso must be string");

      // must have Z or +HH:MM / -HH:MM offset. no naked datetime.
      const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(iso);
      if (!hasZone) {
         throw new Error(
            "iso must have Z or explicit offset — ambiguous otherwise",
         );
      }

      const ms = Date.parse(iso);
      if (Number.isNaN(ms)) throw new Error(`invalid iso: ${iso}`);
      return new Instant({ epochMillis: ms });
   }

   // === getters ===

   get epochMillis(): number {
      return this.props.epochMillis;
   }
   get epochSeconds(): number {
      return Math.trunc(this.props.epochMillis / 1000);
   }

   // === comparison ===

   isBefore(other: Instant): boolean {
      return this.props.epochMillis < other.props.epochMillis;
   }

   isAfter(other: Instant): boolean {
      return this.props.epochMillis > other.props.epochMillis;
   }

   // === arithmetic — all return new Instant ===

   plusMillis(ms: number): Instant {
      return Instant.fromEpochMillis(this.props.epochMillis + ms);
   }

   plusSeconds(s: number): Instant {
      return this.plusMillis(s * 1000);
   }
   plusMinutes(m: number): Instant {
      return this.plusMillis(m * 60_000);
   }
   plusHours(h: number): Instant {
      return this.plusMillis(h * 3_600_000);
   }
   plusDays(d: number): Instant {
      return this.plusMillis(d * 86_400_000);
   }

   // diff in millis. caller converts to whatever unit.
   millisUntil(other: Instant): number {
      return other.props.epochMillis - this.props.epochMillis;
   }

   // === serialization ===

   toISO(): string {
      return new Date(this.props.epochMillis).toISOString();
   }

   override toString(): string {
      return this.toISO();
   }
   toJSON(): string {
      return this.toISO();
   }
}
