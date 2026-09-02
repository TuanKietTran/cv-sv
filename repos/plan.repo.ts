import { Plan, PlanId } from "../domain/catalog";

export interface PlanRepository {
   findById(id: PlanId): Promise<Plan | null>;
   findAll(): Promise<Plan[]>;
   findPublic(): Promise<Plan[]>;
   findByUser(userId: string): Promise<Plan[]>;
   save(plan: Plan): Promise<void>;
   delete(id: PlanId): Promise<void>;
}
