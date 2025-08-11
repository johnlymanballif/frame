#!/usr/bin/env tsx

import { db } from "./db";
import { sql } from "drizzle-orm";

async function applyMigration() {
  console.log("Applying database migration...");
  
  try {
    // Add bill_rate_cents column to users table
    console.log("1. Adding bill_rate_cents column to users table...");
    await db.execute(sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bill_rate_cents" integer DEFAULT 0;
    `);
    console.log("✓ Added bill_rate_cents column");

    // Create role_default_rates table
    console.log("2. Creating role_default_rates table...");
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
    console.log("✓ Created role_default_rates table");

    // Add foreign key constraint
    console.log("3. Adding foreign key constraint...");
    try {
      await db.execute(sql`
        ALTER TABLE "role_default_rates" 
        ADD CONSTRAINT "role_default_rates_org_id_organizations_id_fk" 
        FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
      `);
      console.log("✓ Added foreign key constraint");
    } catch (error: any) {
      if (error.cause?.code === '42710') {
        console.log("✓ Foreign key constraint already exists");
      } else {
        throw error;
      }
    }

    // Create unique index
    console.log("4. Creating unique index...");
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "role_default_rates_org_role_idx" 
      ON "role_default_rates" USING btree ("org_id","role_name");
    `);
    console.log("✓ Created unique index");

    console.log("🎉 Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  applyMigration();
}

export { applyMigration };