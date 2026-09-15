import { ValueObject } from "../value-object";
import type { CvConceptProps, CvProfileProps } from "./types";

export * from "./types";

export class CvProfile extends ValueObject<CvProfileProps> {
   static create(props: CvProfileProps): CvProfile {
      if (!props.identity?.fullName?.trim()) throw new Error("CvProfile requires identity.fullName");
      if (!Number.isInteger(props.version) || props.version < 1) {
         throw new Error("CvProfile version must be a positive integer");
      }
      return new CvProfile(props);
   }

   get version() { return this.props.version; }
   get identity() { return this.props.identity; }
   get contacts() { return this.props.contacts; }
   get experiences() { return this.props.experiences; }
   get skills() { return this.props.skills; }
   get certifications() { return this.props.certifications; }
   get education() { return this.props.education; }
   get projects() { return this.props.projects; }
   get languages() { return this.props.languages; }

   toJSON(): CvProfileProps { return { ...this.props }; }
}

/** Canonical structured representation produced by an import. */
export class CvConcept extends ValueObject<CvConceptProps> {
   static create(props: CvConceptProps): CvConcept {
      if (props.schemaVersion !== 1) throw new Error("Unsupported CvConcept schemaVersion");
      CvProfile.create(props.profile);
      return new CvConcept(props);
   }

   get schemaVersion() { return this.props.schemaVersion; }
   get profile() { return this.props.profile; }
   get source() { return this.props.source; }

   toJSON(): CvConceptProps { return { ...this.props }; }
}
