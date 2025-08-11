import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Load environment variables if not already loaded
if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  try {
    const { config } = require("dotenv");
    config({ path: ".env.local" });
  } catch (error) {
    // Ignore if dotenv is not available
  }
}

// Use environment variable for database connection
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const queryClient = postgres(connectionString, { 
  prepare: false,
  max: 1,
});
export const db = drizzle(queryClient, { schema });