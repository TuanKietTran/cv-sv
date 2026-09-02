import { ValueObject } from "../value-object";
import type { Tier, SubjectAttributesProps } from "./types";

export type { Tier, SubjectAttributesProps };

export class SubjectAttributes extends ValueObject<SubjectAttributesProps> {
   constructor(props: SubjectAttributesProps) {
      super(props);
   }

   static of(attrs: {
      userId: string;
      orgId?: string | null;
      tier: Tier;
      isOwner?: boolean;
      isServiceAccount?: boolean;
   }): SubjectAttributes {
      if (!attrs.userId || !attrs.userId.trim()) {
         throw new Error("SubjectAttributes: userId must not be empty");
      }
      return new SubjectAttributes({
         userId: attrs.userId.trim(),
         orgId: attrs.orgId ?? null,
         tier: attrs.tier,
         isOwner: attrs.isOwner ?? false,
         isServiceAccount: attrs.isServiceAccount ?? false,
      });
   }

   get userId(): string {
      return this.props.userId;
   }
   get orgId(): string | null {
      return this.props.orgId;
   }
   get tier(): Tier {
      return this.props.tier;
   }
   get isOwner(): boolean {
      return this.props.isOwner;
   }
   get isServiceAccount(): boolean {
      return this.props.isServiceAccount;
   }

   toJSON() {
      return {
         userId: this.props.userId,
         orgId: this.props.orgId,
         tier: this.props.tier,
         isOwner: this.props.isOwner,
         isServiceAccount: this.props.isServiceAccount,
      };
   }
}
