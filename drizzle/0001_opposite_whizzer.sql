CREATE TABLE "role_default_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"role_name" text NOT NULL,
	"cost_rate_cents" integer DEFAULT 0,
	"bill_rate_cents" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bill_rate_cents" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "role_default_rates" ADD CONSTRAINT "role_default_rates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "role_default_rates_org_role_idx" ON "role_default_rates" USING btree ("org_id","role_name");