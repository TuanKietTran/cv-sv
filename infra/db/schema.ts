import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const subscriptions = sqliteTable("subscriptions", {
   id: text("id").primaryKey(),
   userId: text("user_id").notNull(),
   planId: text("plan_id").notNull(),
   status: text("status").notNull(),
   startedAt: text("started_at").notNull(),
   currentPeriodStart: text("current_period_start").notNull(),
   currentPeriodEnd: text("current_period_end").notNull(),
   trialEndsAt: text("trial_ends_at"),
   cancelledAt: text("cancelled_at"),
   pausedAt: text("paused_at"),
   nextIntervalPlanId: text("next_interval_plan_id"),
});

export const plans = sqliteTable("plans", {
   id: text("id").primaryKey(),
   name: text("name").notNull(),
   description: text("description").notNull().default(""),
   amountMinor: integer("amount_minor").notNull(),
   currency: text("currency").notNull(),
   billingCycle: text("billing_cycle").notNull(),
   trialDays: integer("trial_days"),
   provider: text("provider").notNull().default(""),
   source: text("source", { enum: ["user", "catalog"] }).notNull().default("catalog"),
   createdBy: text("created_by"),
   features: text("features").notNull().default("[]"), // JSON array
   isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
});

export const users = sqliteTable("users", {
   id: text("id").primaryKey(),
   email: text("email").notNull().unique(),
   passwordHash: text("password_hash").notNull(),
   createdAt: text("created_at").notNull(),
});

export const iamSubjects = sqliteTable("iam_subjects", {
   userId: text("user_id").primaryKey(),
   orgId: text("org_id"),
   tier: text("tier", { enum: ["free", "pro", "enterprise"] }).notNull(),
   isServiceAccount: integer("is_service_account", { mode: "boolean" })
      .notNull()
      .default(false),
});
