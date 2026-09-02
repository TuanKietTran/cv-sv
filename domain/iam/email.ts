import { ValueObject } from "../value-object";

export interface EmailProps {
   value: string;
}

export class Email extends ValueObject<EmailProps> {
   constructor(props: EmailProps) {
      super(props);
   }

   static create(raw: string): Email {
      const trimmed = raw.trim().toLowerCase();
      if (!trimmed) {
         throw new Error('Empty email address');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
         throw new Error('Invalid email address');
      }
      return new Email({ value: trimmed });
   }

   get value(): string {
      return this.props.value;
   }
}
