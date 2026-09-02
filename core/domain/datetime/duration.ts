import { ValueObject } from "../value-object";
import type { DurationProps } from "./types";

export type { DurationProps };

export class Duration extends ValueObject<DurationProps> {
   constructor(props: DurationProps) {
      super(props);
   }

   get millis(): number {
      return this.props.millis;
   }

   get seconds(): number {
      return this.props.millis / 1000;
   }

   get minutes(): number {
      return this.props.millis / 60000;
   }

   get hours(): number {
      return this.props.millis / 3600000;
   }

   get days(): number {
      return this.props.millis / 86400000;
   }

   static fromMillis(millis: number): Duration {
      return new Duration({ millis });
   }

   static fromSeconds(seconds: number): Duration {
      return new Duration({ millis: seconds * 1000 });
   }

   static fromMinutes(minutes: number): Duration {
      return new Duration({ millis: minutes * 60000 });
   }

   static fromHours(hours: number): Duration {
      return new Duration({ millis: hours * 3600000 });
   }

   static fromDays(days: number): Duration {
      return new Duration({ millis: days * 86400000 });
   }

   add(other: Duration): Duration {
      return new Duration({ millis: this.props.millis + other.props.millis });
   }

   minus(other: Duration): Duration {
      return new Duration({ millis: this.props.millis - other.props.millis });
   }

   multipliedBy(factor: number): Duration {
      return new Duration({ millis: this.props.millis * factor });
   }

   dividedBy(factor: number): Duration {
      return new Duration({ millis: this.props.millis / factor });
   }

   negate(): Duration {
      return new Duration({ millis: -this.props.millis });
   }
}
