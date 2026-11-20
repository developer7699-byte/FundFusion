ALTER TABLE "p2p_quote" DROP CONSTRAINT "p2p_quote_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "p2p_quote" ADD CONSTRAINT "p2p_quote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;