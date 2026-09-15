import { ValueObject } from "../value-object";
import type { CvImportJobProps } from "./types";

export { CV_IMPORT_STATES } from "./types";
export type {
   CvImportState,
   CvImportErrorCode,
   CvSourceArtifact,
   CvGeneratedArtifact,
   CvImportError,
   CvImportJobProps,
   CvImportPreview,
   CvPipelineCapabilities,
} from "./types";

export class CvImportJob extends ValueObject<CvImportJobProps> {
   static create(props: CvImportJobProps): CvImportJob {
      if (!props.id.trim()) throw new Error("CvImportJob requires an id");
      if (!props.ownerId.trim()) throw new Error("CvImportJob requires an ownerId");
      if (props.progress < 0 || props.progress > 100) {
         throw new Error("CvImportJob progress must be between 0 and 100");
      }
      if (!Number.isInteger(props.attempt) || props.attempt < 1) {
         throw new Error("CvImportJob attempt must be a positive integer");
      }
      return new CvImportJob(props);
   }

   get id() { return this.props.id; }
   get ownerId() { return this.props.ownerId; }
   get template() { return this.props.template; }
   get state() { return this.props.state; }
   get progress() { return this.props.progress; }
   get stage() { return this.props.stage; }
   get source() { return this.props.source; }
   get artifacts() { return this.props.artifacts; }
   get warnings() { return this.props.warnings; }
   get error() { return this.props.error; }
   get cancelRequested() { return this.props.cancelRequested; }
   get attempt() { return this.props.attempt; }
   get idempotencyKey() { return this.props.idempotencyKey; }
   get createdAt() { return this.props.createdAt; }
   get updatedAt() { return this.props.updatedAt; }

   toJSON(): CvImportJobProps { return { ...this.props }; }
}
