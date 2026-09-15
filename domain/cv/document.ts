import { ValueObject } from "../value-object";
import type { CvDocumentProps } from "./types";

export type { UpdateCvDocumentInput, CvDocumentSummary, CvUpdateEvent } from "./types";

export class CvDocument extends ValueObject<CvDocumentProps> {
   static create(props: CvDocumentProps): CvDocument {
      if (!props.id.trim()) throw new Error("CvDocument requires an id");
      if (typeof props.markdown !== "string" || typeof props.css !== "string") {
         throw new Error("CvDocument requires markdown and css");
      }
      if (!Number.isInteger(props.revision) || props.revision < 1) {
         throw new Error("CvDocument revision must be a positive integer");
      }
      return new CvDocument(props);
   }

   get id() { return this.props.id; }
   get title() { return this.props.title; }
   get markdown() { return this.props.markdown; }
   get css() { return this.props.css; }
   get revision() { return this.props.revision; }
   get updatedAt() { return this.props.updatedAt; }

   toJSON(): CvDocumentProps { return { ...this.props }; }
}
