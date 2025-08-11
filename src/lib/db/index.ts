import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Load environment variables if not already loaded
// Note: avoid require() in ESM TypeScript to satisfy eslint rule
// Local development can load env via Next.js or a dev runner; Vercel provides env at runtime

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