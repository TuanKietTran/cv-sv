export type CvChangeSource = "browser" | "mcp" | "import" | "tailor" | "restore" | "system";

export interface CvVersionRef {
   id: string;
   version: number;
}

export interface CvVersionedSnapshot<T> {
   ref: CvVersionRef;
   value: Readonly<T>;
   checksum?: string;
}

export interface CvRevision<T> {
   revision: number;
   parentRevision: number | null;
   value: Readonly<T>;
   actorId: string;
   source: CvChangeSource;
   workflowId?: string;
   createdAt: string;
}

export class CvRevisionConflict extends Error {
   constructor(readonly expectedRevision: number, readonly currentRevision: number) {
      super(`Revision conflict: expected ${expectedRevision}, current ${currentRevision}`);
      this.name = "CvRevisionConflict";
   }
}

export function assertExpectedRevision(expected: number, current: number): void {
   if (!Number.isInteger(expected) || expected < 1) throw new Error("expectedRevision must be a positive integer");
   if (expected !== current) throw new CvRevisionConflict(expected, current);
}
