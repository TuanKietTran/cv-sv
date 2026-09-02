import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";
import type { SubscriptionRepository } from "../repos/subscription.repo";

export interface ResumeSubscriptionInput {
   subscriptionId: string;
}

export interface ResumeSubscriptionOutput {
   subscriptionId: string;
}

export function createResumeSubscriptionHandler(repo: SubscriptionRepository) {
   return createHandler<ResumeSubscriptionInput, ResumeSubscriptionOutput>(
      "ResumeSubscription",
      async (payload) => {
         const id = SubscriptionId.of(payload.subscriptionId);
         const sub = await repo.findById(id);
         if (!sub) {
            return { success: false, error: `Subscription not found: ${payload.subscriptionId}` };
         }

         const resumed = sub.resume();
         await repo.save(resumed);

         return {
            success: true,
            data: { subscriptionId: resumed.id.value },
         };
      },
   );
}

export function resumeSubscriptionCommand(input: ResumeSubscriptionInput) {
   return {
      _type: "command" as const,
      requestName: "ResumeSubscription",
      payload: input,
   };
}

export function registerResumeSubscription(repo: SubscriptionRepository) {
   useMediator().registerCommand(createResumeSubscriptionHandler(repo));
}
