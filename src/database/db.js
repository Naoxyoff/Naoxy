import { createClient } from "@libsql/client";

const dbUrl = process.env.TURSO_DATABASE_URL || "file:local.db";
const dbAuthToken = process.env.TURSO_AUTH_TOKEN || "";

const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

export default db;
