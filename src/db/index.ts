import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres_secure_password@localhost:5434/matos_voicedocs";

// In development, prevent creating multiple connection pools across HMR reloads
const globalForDb = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
};

export const client =
  globalForDb.postgresClient ||
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });
