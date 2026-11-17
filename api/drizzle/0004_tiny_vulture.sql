ALTER TABLE "session" ADD COLUMN "family_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "replaced_by_id" uuid;