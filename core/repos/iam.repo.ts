import { UserId } from "../domain/iam/user-id";
import type { Tier } from "../domain/iam/subject-attributes";

export interface StoredSubject {
   userId: string;
   orgId: string | null;
   tier: Tier;
   isServiceAccount: boolean;
}

export interface IamSubjectRepository {
   findByUserId(userId: UserId): Promise<StoredSubject | null>;
   save(subject: StoredSubject): Promise<void>;
   delete(userId: UserId): Promise<void>;
}
