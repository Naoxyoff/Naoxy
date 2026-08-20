import { createClient } from "@libsql/client";

const dbUrl = process.env.TURSO_DATABASE_URL || "file:local.db";
const dbAuthToken = process.env.TURSO_AUTH_TOKEN || "";

const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

// Fonction utilitaire pour récupérer ou créer les paramètres d'une guilde
export async function getGuildSettings(guildId) {
  const res = await db.execute({
    sql: "SELECT * FROM guild_settings WHERE guild_id = ?",
    args: [guildId]
  });
  
  if (res.rows.length === 0) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)",
      args: [guildId]
    });
    const retryRes = await db.execute({
      sql: "SELECT * FROM guild_settings WHERE guild_id = ?",
      args: [guildId]
    });
    return retryRes.rows[0];
  }
  return res.rows[0];
}

export default db;
