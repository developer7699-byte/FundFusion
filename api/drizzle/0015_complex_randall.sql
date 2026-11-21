CREATE TYPE "public"."dispute_outcome" AS ENUM('RELEASE', 'REFUND', 'SPLIT', 'REFUND_WITH_PENALTY');--> statement-breakpoint
ALTER TABLE "dispute" ALTER COLUMN "ticket_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "opened_by" uuid;--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "outcome" "dispute_outcome";--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "counterparty_amount" numeric(38, 18);--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "penalty_amount" numeric(38, 18);--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "resolved_by" uuid;--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dispute" ADD COLUMN "resolution_reason" text;--> statement-breakpoint
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_opened_by_user_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;