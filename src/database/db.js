import { createClient } from "@libsql/client";

const dbUrl = process.env.TURSO_DATABASE_URL || "file:local.db";
const dbAuthToken = process.env.TURSO_AUTH_TOKEN || "";

const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

// Initialisation des tables sur Turso
export async function initDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT DEFAULT '!',
      welcome_channel TEXT,
      welcome_message TEXT,
      leave_channel TEXT,
      leave_message TEXT,
      log_channel TEXT,
      log_channel_id TEXT,
      auto_role TEXT,
      levels_enabled INTEGER DEFAULT 1,
      levels_channel TEXT,
      levels_message TEXT DEFAULT '{user} vient de passer au niveau **{level}** !',
      economy_enabled INTEGER DEFAULT 1,
      suggestion_channel TEXT,
      report_channel TEXT,
      birthday_channel TEXT,
      ticket_category TEXT,
      ticket_support_role TEXT,
      automod_enabled INTEGER DEFAULT 0,
      automod_anti_spam INTEGER DEFAULT 0,
      automod_anti_link INTEGER DEFAULT 0,
      automod_badwords TEXT DEFAULT '[]',
      starboard_channel TEXT,
      starboard_threshold INTEGER DEFAULT 3,
      spam_threshold INTEGER DEFAULT 5,
      spam_interval INTEGER DEFAULT 3,
      mention_threshold INTEGER DEFAULT 5,
      raid_threshold INTEGER DEFAULT 10,
      raid_interval INTEGER DEFAULT 10,
      nuke_threshold INTEGER DEFAULT 3,
      mute_duration INTEGER DEFAULT 10,
      log_messages_channel TEXT,
      log_membres_channel TEXT,
      log_moderation_channel TEXT,
      log_serveur_channel TEXT,
      ticket_name TEXT DEFAULT 'ticket-{user}',
      ai_enabled INTEGER DEFAULT 0,
      ai_channel TEXT,
      ai_model TEXT DEFAULT 'llama-3.3-70b',
      ai_prompt TEXT,
      ai_language TEXT DEFAULT 'fr',
      ai_memory INTEGER DEFAULT 0,
      ai_max_tokens INTEGER DEFAULT 500,
      ai_persona TEXT,
      ai_lang TEXT DEFAULT 'fr',
      antinuke_enabled INTEGER DEFAULT 1,
      an_alert_channel TEXT,
      an_delchan INTEGER DEFAULT 1,
      an_delrole INTEGER DEFAULT 1,
      an_massban INTEGER DEFAULT 1,
      an_masskick INTEGER DEFAULT 1,
      an_webhook INTEGER DEFAULT 1,
      an_chan_thresh INTEGER DEFAULT 2,
      an_ban_thresh INTEGER DEFAULT 3,
      an_kick_thresh INTEGER DEFAULT 3,
      an_action TEXT DEFAULT 'ban',
      an_punish_role TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT, channel_id TEXT, user_id TEXT,
      subject TEXT, status TEXT DEFAULT 'open',
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '🎫',
      description TEXT DEFAULT 'Ouvrir un ticket',
      category_open_id TEXT,
      support_role_id TEXT,
      ticket_open_name TEXT DEFAULT 'ticket-{count}-{username}',
      ticket_padding INTEGER DEFAULT 4,
      welcome_message TEXT,
      embed_title TEXT,
      embed_color TEXT DEFAULT '#7c3aed',
      log_channel_id TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT, user_id TEXT, moderator_id TEXT, reason TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT, channel_id TEXT, message_id TEXT, host_id TEXT,
      prize TEXT, winners_count INTEGER DEFAULT 1,
      entries TEXT DEFAULT '[]', ends_at INTEGER, ended INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);
}

// Fonction pour récupérer ou créer les paramètres du serveur
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