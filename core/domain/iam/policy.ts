import { AccessRequest } from "./access-request";
import { AccessDecision } from "./access-decision";

export interface Policy {
  name: string;
  /** Return a decision, or null to abstain (policy not applicable). */
  evaluate(request: AccessRequest): AccessDecision | null;
}

/**
 * Deny-overrides combinator:
 *   1. Any explicit deny → deny.
 *   2. No deny + at least one allow → allow.
 *   3. All abstain → deny (default-deny).
 */
export class PolicyEvaluator {
  constructor(private readonly policies: ReadonlyArray<Policy>) {}

  evaluate(request: AccessRequest): AccessDecision {
    let hasAllow = false;

    for (const policy of this.policies) {
      const decision = policy.evaluate(request);
      if (decision === null) continue; // abstain
      if (!decision.isAllowed()) {
        return AccessDecision.deny(
          `[${policy.name}] ${decision.reason}`,
        );
      }
      hasAllow = true;
    }

    if (hasAllow) {
      return AccessDecision.allow("At least one policy allowed the request");
    }

    return AccessDecision.deny("No policy allowed the request (default-deny)");
  }
}

// ---------------------------------------------------------------------------
// Built-in policies
// ---------------------------------------------------------------------------

/**
 * Owners have full access to resources they own.
 * Applies when: subject.isOwner && resource.ownerUserId === subject.userId
 */
export const OwnerFullAccessPolicy: Policy = {
  name: "OwnerFullAccessPolicy",
  evaluate(request) {
    const { subject, resource } = request;
    if (subject.isOwner && resource.ownerUserId === subject.userId) {
      return AccessDecision.allow("Owner has full access to own resources");
    }
    return null; // abstain
  },
};

/**
 * Service accounts are read-only; they may not mutate or cancel/pause subscriptions.
 * Applies when: subject.isServiceAccount
 * Allows *:read codes; denies everything else.
 */
export const ServiceAccountReadOnlyPolicy: Policy = {
  name: "ServiceAccountReadOnlyPolicy",
  evaluate(request) {
    const { subject, action } = request;
    if (!subject.isServiceAccount) return null; // abstain

    if (action.isReadOnly()) {
      return AccessDecision.allow("Service account may read");
    }
    return AccessDecision.deny(
      `Service accounts are read-only; denied ${action.code}`,
    );
  },
};

/**
 * Members of the same org may read subscription resources.
 * Applies when: subject.orgId === resource.ownerOrgId && !subject.isServiceAccount
 */
export const SameOrgPolicy: Policy = {
  name: "SameOrgPolicy",
  evaluate(request) {
    const { subject, resource, action } = request;
    if (
      subject.orgId !== null &&
      subject.orgId === resource.ownerOrgId &&
      !subject.isServiceAccount
    ) {
      if (action.code === "subscription:read") {
        return AccessDecision.allow("Same-org member may read subscription");
      }
    }
    return null; // abstain
  },
};
