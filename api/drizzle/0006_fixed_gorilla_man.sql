CREATE TYPE "public"."authoritative_side" AS ENUM('CRYPTO', 'FIAT');--> statement-breakpoint
CREATE TYPE "public"."quote_side" AS ENUM('BUY', 'SELL');--> statement-breakpoint
CREATE TABLE "p2p_quote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"side" "quote_side" NOT NULL,
	"reference_rate" numeric(20, 2) NOT NULL,
	"customer_rate" numeric(20, 2) NOT NULL,
	"markup_bps" integer NOT NULL,
	"usdt_amount" numeric(38, 18) NOT NULL,
	"inr_amount" numeric(20, 2) NOT NULL,
	"authoritative_side" "authoritative_side" NOT NULL,
	"platform_fee_usdt" numeric(38, 18) NOT NULL,
	"provider" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "p2p_quote" ADD CONSTRAINT "p2p_quote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- PRD §7: the snapshot is law. An order settles at its quoted rate however far
-- the market has moved, so a quote that can be edited after the fact is not a
-- snapshot — it is an invitation to repricing a dispute. Enforced by the
-- database for the same reason audit_log is: a rule only the application keeps
-- is a rule any psql session or future service can break.
CREATE OR REPLACE FUNCTION p2p_quote_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'p2p_quote is immutable: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS p2p_quote_no_update ON "p2p_quote";
--> statement-breakpoint
CREATE TRIGGER p2p_quote_no_update
  BEFORE UPDATE OR DELETE ON "p2p_quote"
  FOR EACH ROW EXECUTE FUNCTION p2p_quote_immutable();
