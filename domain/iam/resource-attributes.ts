import { ValueObject } from "../value-object";
import type { ResourceType, ResourceAttributesProps } from "./types";

export type { ResourceType, ResourceAttributesProps };

export class ResourceAttributes extends ValueObject<ResourceAttributesProps> {
   constructor(props: ResourceAttributesProps) {
      super(props);
   }

   static of(attrs: {
      resourceType: ResourceType;
      resourceId: string;
      ownerUserId?: string | null;
      ownerOrgId?: string | null;
   }): ResourceAttributes {
      if (!attrs.resourceId || !attrs.resourceId.trim()) {
         throw new Error("ResourceAttributes: resourceId must not be empty");
      }
      return new ResourceAttributes({
         resourceType: attrs.resourceType,
         resourceId: attrs.resourceId.trim(),
         ownerUserId: attrs.ownerUserId ?? null,
         ownerOrgId: attrs.ownerOrgId ?? null,
      });
   }

   get resourceType(): ResourceType {
      return this.props.resourceType;
   }
   get resourceId(): string {
      return this.props.resourceId;
   }
   get ownerUserId(): string | null {
      return this.props.ownerUserId;
   }
   get ownerOrgId(): string | null {
      return this.props.ownerOrgId;
   }

   toJSON() {
      return {
         resourceType: this.props.resourceType,
         resourceId: this.props.resourceId,
         ownerUserId: this.props.ownerUserId,
         ownerOrgId: this.props.ownerOrgId,
      };
   }
}
