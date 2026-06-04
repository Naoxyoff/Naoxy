const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "bot.db");
const db = new Database(DB_PATH);

const cols = [
  "ALTER TABLE guild_settings ADD COLUMN ai_enabled INTEGER DEFAULT 0",
  "ALTER TABLE guild_settings ADD COLUMN ai_channel TEXT",
  "ALTER TABLE guild_settings ADD COLUMN ai_model TEXT DEFAULT 'llama3-70b-8192'",
  "ALTER TABLE guild_settings ADD COLUMN ai_prompt TEXT",
  "ALTER TABLE guild_settings ADD COLUMN ai_language TEXT DEFAULT 'fr'",
  "ALTER TABLE guild_settings ADD COLUMN ai_memory INTEGER DEFAULT 0",
  "ALTER TABLE guild_settings ADD COLUMN ai_max_tokens INTEGER DEFAULT 500",
  "ALTER TABLE guild_settings ADD COLUMN ai_persona TEXT",
  "ALTER TABLE guild_settings ADD COLUMN ai_lang TEXT DEFAULT 'fr'"
];

for (const sql of cols) {
  try { db.exec(sql); console.log("✅ " + sql); }
  catch(e) { console.log("⏭️ Déjà existante:", e.message); }
}
