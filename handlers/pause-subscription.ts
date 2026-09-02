import { createHandler, useMediator } from "../cqrs";
import { SubscriptionId } from "../domain/subscription/subscription";
import { Instant } from "../domain/datetime/instant";
import type { SubscriptionRepository } from "../repos/subscription.repo";

export interface PauseSubscriptionInput {
   subscriptionId: string;
   pausedAt?: string;
}

export interface PauseSubscriptionOutput {
   subscriptionId: string;
   pausedAt: string;
}

export function createPauseSubscriptionHandler(repo: SubscriptionRepository) {
   return createHandler<PauseSubscriptionInput, PauseSubscriptionOutput>(
      "PauseSubscription",
      async (payload) => {
         const id = SubscriptionId.of(payload.subscriptionId);
         const sub = await repo.findById(id);
         if (!sub) {
            return { success: false, error: `Subscription not found: ${payload.subscriptionId}` };
         }

         const at = payload.pausedAt ? Instant.fromISO(payload.pausedAt) : Instant.now();
         const paused = sub.pause(at);
         await repo.save(paused);

         return {
            success: true,
            data: {
               subscriptionId: paused.id.value,
               pausedAt: at.toISO(),
            },
         };
      },
   );
}

export function pauseSubscriptionCommand(input: PauseSubscriptionInput) {
   return {
      _type: "command" as const,
      requestName: "PauseSubscription",
      payload: input,
   };
}

export function registerPauseSubscription(repo: SubscriptionRepository) {
   useMediator().registerCommand(createPauseSubscriptionHandler(repo));
}
