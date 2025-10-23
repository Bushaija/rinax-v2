import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from "postgres";
import * as schema from '@/db/schema';
import env from "@/env";
// Ensure relational metadata (one/many helpers) is attached to tables
import '@/db/schema/relations';

export const connection = postgres(env.DATABASE_URL, {
  max: (env.DB_MIGRATING || env.DB_SEEDING) ? 1 : undefined,
  onnotice: env.DB_SEEDING ? () => {} : undefined,
});

export const db = drizzle(connection, {
  schema,
  logger: true,
});

export type Database = typeof db;

export default db;