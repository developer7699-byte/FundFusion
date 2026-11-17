CREATE TYPE "public"."capability_key" AS ENUM('DEPOSIT', 'WITHDRAW', 'SEND', 'P2P_BUY', 'P2P_SELL');--> statement-breakpoint
CREATE TYPE "public"."grant_effect" AS ENUM('ALLOW', 'DENY');--> statement-breakpoint
CREATE TABLE "role_capability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "role_name" NOT NULL,
	"capability" "capability_key" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_capability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"capability" "capability_key" NOT NULL,
	"effect" "grant_effect" NOT NULL,
	"actor_id" uuid,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "role_capability" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
-- PRD §9.2 replaces the single ADMIN role with SUPPORT and SUPER_ADMIN.
-- The columns are plain text at this point, so remap before the enum is
-- recreated: without this, any existing ADMIN row fails the cast below.
UPDATE "role" SET "name" = 'SUPER_ADMIN' WHERE "name" = 'ADMIN';--> statement-breakpoint
UPDATE "role_capability" SET "role" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN';--> statement-breakpoint
DROP TYPE "public"."role_name";--> statement-breakpoint
CREATE TYPE "public"."role_name" AS ENUM('CUSTOMER', 'MERCHANT', 'SUPPORT', 'SUPER_ADMIN');--> statement-breakpoint
ALTER TABLE "role" ALTER COLUMN "name" SET DATA TYPE "public"."role_name" USING "name"::"public"."role_name";--> statement-breakpoint
ALTER TABLE "role_capability" ALTER COLUMN "role" SET DATA TYPE "public"."role_name" USING "role"::"public"."role_name";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "mfa_secret" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "mfa_enrolled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_capability" ADD CONSTRAINT "user_capability_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_capability" ADD CONSTRAINT "user_capability_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "role_capability_role_capability_key" ON "role_capability" USING btree ("role","capability");--> statement-breakpoint
CREATE UNIQUE INDEX "user_capability_user_id_capability_key" ON "user_capability" USING btree ("user_id","capability");