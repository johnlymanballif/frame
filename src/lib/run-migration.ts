import { db } from "./db";
import { sql } from "drizzle-orm";

export async function runLatestMigration() {
  try {
    console.log("Running database migration...");
    
    // Create role_default_rates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "role_default_rates" (
        "id" serial PRIMARY KEY NOT NULL,
        "org_id" integer NOT NULL,
        "role_name" text NOT NULL,
        "cost_rate_cents" integer DEFAULT 0,
        "bill_rate_cents" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Add bill_rate_cents to users table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bill_rate_cents" integer DEFAULT 0;
    `);
    
    // Add foreign key constraint for role_default_rates
    await db.execute(sql`
      ALTER TABLE "role_default_rates" 
      ADD CONSTRAINT IF NOT EXISTS "role_default_rates_org_id_organizations_id_fk" 
      FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
    `);
    
    // Create unique index
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "role_default_rates_org_role_idx" 
      ON "role_default_rates" USING btree ("org_id","role_name");
    `);
    
    console.log("Migration completed successfully!");
    return { success: true };
  } catch (error) {
    console.error("Migration failed:", error);
    return { success: false, error };
  }
}