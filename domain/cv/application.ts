import { ValueObject } from "../value-object";
import type { CvProfile } from "./concept";
import type { CvTemplate } from "./template";
import type { CvVersionedSnapshot } from "./version";

export type CvApplicationStatus = "draft" | "ready" | "submitted" | "archived";

const CV_APPLICATION_STATUSES: readonly CvApplicationStatus[] = ["draft", "ready", "submitted", "archived"];

/**
 * A CV application is exactly a versioned template plus a versioned profile
 * snapshot. Profile data is not persisted or mutated through a separate API.
 */
export interface CvApplicationProps {
   id: string;
   ownerId: string;
   revision: number;
   template: CvVersionedSnapshot<CvTemplate>;
   profile: CvVersionedSnapshot<CvProfile>;
   status: CvApplicationStatus;
   createdAt: string;
   updatedAt: string;
}

export class CvApplication extends ValueObject<CvApplicationProps> {
   static create(props: CvApplicationProps): CvApplication {
      if (!props.id.trim()) throw new Error("CvApplication requires an id");
      if (!props.ownerId.trim()) throw new Error("CvApplication requires an ownerId");
      if (!Number.isInteger(props.revision) || props.revision < 1) {
         throw new Error("CvApplication revision must be a positive integer");
      }
      if (!CV_APPLICATION_STATUSES.includes(props.status)) {
         throw new Error(`CvApplication status must be one of ${CV_APPLICATION_STATUSES.join(", ")}`);
      }
      return new CvApplication(props);
   }

   get id() { return this.props.id; }
   get ownerId() { return this.props.ownerId; }
   get revision() { return this.props.revision; }
   get template() { return this.props.template; }
   get profile() { return this.props.profile; }
   get status() { return this.props.status; }
   get createdAt() { return this.props.createdAt; }
   get updatedAt() { return this.props.updatedAt; }

   toJSON(): CvApplicationProps { return { ...this.props }; }
}
