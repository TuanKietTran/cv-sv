import { createHandler, useMediator } from "../cqrs";
import type { SubscriptionRepository } from "../repos/subscription.repo";

export interface ListSubscriptionsInput {
   userId: string;
}

export interface ListSubscriptionsOutput {
   subscriptions: ReturnType<import("../domain/subscription/subscription").Subscription["toJSON"]>[];
}

export function createListSubscriptionsHandler(repo: SubscriptionRepository) {
   return createHandler<ListSubscriptionsInput, ListSubscriptionsOutput>(
      "ListSubscriptions",
      async (payload) => {
         const subs = await repo.findByUser(payload.userId);
         return { success: true, data: { subscriptions: subs.map(s => s.toJSON()) } };
      },
   );
}

export function listSubscriptionsQuery(input: ListSubscriptionsInput) {
   return { _type: "query" as const, requestName: "ListSubscriptions", payload: input };
}

export function registerListSubscriptions(repo: SubscriptionRepository) {
   useMediator().registerQuery(createListSubscriptionsHandler(repo));
}
