import type { SubscriptionRepository } from "@core/repos/subscription.repo";
import type { PlanRepository } from "@core/repos/plan.repo";
import type { IamSubjectRepository } from "@core/repos/iam.repo";
import type { UserRepository } from "@core/repos/user.repo";

export interface Repos {
   sub: SubscriptionRepository;
   plan: PlanRepository;
   iam: IamSubjectRepository;
   user: UserRepository;
}
