CREATE TABLE "chain_cursor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_id" uuid NOT NULL,
	"last_scanned_block" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chain_cursor_network_id_unique" UNIQUE("network_id")
);
--> statement-breakpoint
ALTER TABLE "deposit" ADD COLUMN "log_index" integer;--> statement-breakpoint
ALTER TABLE "deposit" ADD COLUMN "block_number" bigint;--> statement-breakpoint
ALTER TABLE "chain_cursor" ADD CONSTRAINT "chain_cursor_network_id_blockchain_network_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."blockchain_network"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deposit_network_id_tx_hash_log_index_key" ON "deposit" USING btree ("network_id","tx_hash","log_index");