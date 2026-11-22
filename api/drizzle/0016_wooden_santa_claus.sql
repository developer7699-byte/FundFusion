CREATE TYPE "public"."payment_method_type" AS ENUM('BANK', 'UPI');--> statement-breakpoint
CREATE TABLE "order_payment_instruction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"payee_user_id" uuid NOT NULL,
	"source_method_id" uuid,
	"type" "payment_method_type" NOT NULL,
	"holder_name" text NOT NULL,
	"account_number" text,
	"ifsc" text,
	"upi_vpa" text,
	"chosen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_payment_instruction_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "payment_method" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "payment_method_type" NOT NULL,
	"label" text NOT NULL,
	"holder_name" text NOT NULL,
	"account_number" text,
	"ifsc" text,
	"upi_vpa" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_payment_instruction" ADD CONSTRAINT "order_payment_instruction_order_id_p2p_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."p2p_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payment_instruction" ADD CONSTRAINT "order_payment_instruction_payee_user_id_user_id_fk" FOREIGN KEY ("payee_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payment_instruction" ADD CONSTRAINT "order_payment_instruction_source_method_id_payment_method_id_fk" FOREIGN KEY ("source_method_id") REFERENCES "public"."payment_method"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_method_one_default_idx" ON "payment_method" USING btree ("user_id") WHERE "payment_method"."is_default" and "payment_method"."deleted_at" is null;