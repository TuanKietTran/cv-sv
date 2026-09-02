import { Subscription, SubscriptionId } from "../domain/subscription/subscription";

export interface SubscriptionRepository {
   findById(id: SubscriptionId): Promise<Subscription | null>;
   save(sub: Subscription): Promise<void>;
   findByUser(userId: string): Promise<Subscription[]>;
   delete(id: SubscriptionId): Promise<void>;
}
