CREATE TABLE "withdrawal_address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"network_id" uuid NOT NULL,
	"address" text NOT NULL,
	"label" text,
	"usable_from" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "withdrawal" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD COLUMN "tx_hash" text;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD COLUMN "review_reason" text;--> statement-breakpoint
ALTER TABLE "withdrawal_address" ADD CONSTRAINT "withdrawal_address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_address" ADD CONSTRAINT "withdrawal_address_network_id_blockchain_network_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."blockchain_network"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "withdrawal_address_user_id_network_id_address_key" ON "withdrawal_address" USING btree ("user_id","network_id","address");--> statement-breakpoint
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "withdrawal_idempotency_key_key" ON "withdrawal" USING btree ("idempotency_key");