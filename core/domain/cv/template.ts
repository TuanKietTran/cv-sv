import { ValueObject } from "../value-object";
import type { CvTemplateProps } from "./types";

export type { CvTemplateCapabilities, CvTemplateReference } from "./types";

/** Immutable, versioned presentation. Templates never contain a person's profile data. */
export class CvTemplate extends ValueObject<CvTemplateProps> {
   static create(props: CvTemplateProps): CvTemplate {
      if (!props.id.trim()) throw new Error("CvTemplate requires an id");
      if (!Number.isInteger(props.version) || props.version < 1) {
         throw new Error("CvTemplate version must be a positive integer");
      }
      if (!props.name.trim()) throw new Error("CvTemplate requires a name");
      return new CvTemplate(props);
   }

   get id() { return this.props.id; }
   get version() { return this.props.version; }
   get name() { return this.props.name; }
   get markdownSkeleton() { return this.props.markdownSkeleton; }
   get css() { return this.props.css; }
   get capabilities() { return this.props.capabilities; }
   get builtIn() { return this.props.builtIn; }
   get tags() { return this.props.tags; }
   get createdAt() { return this.props.createdAt; }

   toJSON(): CvTemplateProps { return { ...this.props }; }
}
