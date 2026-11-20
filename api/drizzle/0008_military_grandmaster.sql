ALTER TABLE "p2p_order" ADD COLUMN "quote_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "p2p_order" ADD CONSTRAINT "p2p_order_quote_id_p2p_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."p2p_quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p2p_order" ADD CONSTRAINT "p2p_order_quote_id_unique" UNIQUE("quote_id");