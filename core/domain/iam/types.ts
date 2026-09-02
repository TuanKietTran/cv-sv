// ── Type aliases ────────────────────────────────────────────────────────────

export type Tier = "free" | "pro" | "enterprise";

export type ActionCode =
   | "subscription:read"
   | "subscription:write"
   | "subscription:cancel"
   | "subscription:pause"
   | "subscription:resume"
   | "subscription:renew"
   | "iam:read"
   | "iam:write";

export type ResourceType = "subscription" | "plan" | "user" | "org";

// ── Props interfaces ─────────────────────────────────────────────────────────

export interface UserIdProps {
   value: string;
}

export interface ActionProps {
   code: ActionCode;
}

export interface SubjectAttributesProps {
   userId: string;
   orgId: string | null;
   tier: Tier;
   isOwner: boolean;
   isServiceAccount: boolean;
}

export interface ResourceAttributesProps {
   resourceType: ResourceType;
   resourceId: string;
   ownerUserId: string | null;
   ownerOrgId: string | null;
}

export interface AccessDecisionProps {
   effect: "allow" | "deny";
   reason: string;
}
