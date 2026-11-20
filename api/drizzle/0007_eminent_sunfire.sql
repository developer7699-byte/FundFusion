ALTER TABLE "p2p_order" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "p2p_order" ALTER COLUMN "status" SET DEFAULT 'QUOTED'::text;--> statement-breakpoint
-- PRD §6.6. Remap before the type swap, never after: the old fourteen values
-- are the prototype's, and casting 'CREATED' straight into the new type fails
-- the whole migration. CANCELLED and FAILED land on EXPIRED rather than on a
-- settled state — a dead order returns funds, it never advances them (§6.9).
UPDATE "p2p_order" SET "status" = CASE "status"
  WHEN 'CREATED'         THEN 'QUOTED'
  WHEN 'FUNDS_LOCKED'    THEN 'AWAITING_MERCHANT'
  WHEN 'MATCHING'        THEN 'AWAITING_MERCHANT'
  WHEN 'SELLER_ASSIGNED' THEN 'ACCEPTED'
  WHEN 'PAYMENT_PENDING' THEN 'ACCEPTED'
  WHEN 'VERIFICATION'    THEN 'PAYMENT_SUBMITTED'
  WHEN 'REFUND_PENDING'  THEN 'REFUNDED'
  WHEN 'CANCELLED'       THEN 'EXPIRED'
  WHEN 'FAILED'          THEN 'EXPIRED'
  ELSE "status"
END;--> statement-breakpoint
DROP TYPE "public"."order_status";--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('QUOTED', 'AWAITING_MERCHANT', 'ACCEPTED', 'PAYMENT_SUBMITTED', 'COMPLETED', 'DISPUTED', 'REFUNDED', 'EXPIRED');--> statement-breakpoint
ALTER TABLE "p2p_order" ALTER COLUMN "status" SET DEFAULT 'QUOTED'::"public"."order_status";--> statement-breakpoint
ALTER TABLE "p2p_order" ALTER COLUMN "status" SET DATA TYPE "public"."order_status" USING "status"::"public"."order_status";--> statement-breakpoint
ALTER TABLE "p2p_order" DROP COLUMN "side";--> statement-breakpoint
ALTER TABLE "p2p_order" DROP COLUMN "asset_symbol";--> statement-breakpoint
ALTER TABLE "p2p_order" DROP COLUMN "crypto_amount";--> statement-breakpoint
ALTER TABLE "p2p_order" DROP COLUMN "inr_amount";--> statement-breakpoint
ALTER TABLE "p2p_order" DROP COLUMN "fee_amount";