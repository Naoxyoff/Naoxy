import db from "./db.js";

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
      log_serveur_channel TEXT
    );
  `);

  await db.execute(`CREATE TABLE IF NOT EXISTS warnings (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT, user_id TEXT, moderator_id TEXT, reason TEXT, created_at INTEGER DEFAULT (unixepoch()))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS sanctions (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT, user_id TEXT, moderator_id TEXT, type TEXT, reason TEXT, duration INTEGER, expires_at INTEGER, active INTEGER DEFAULT 1, created_at INTEGER DEFAULT (unixepoch()))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS giveaways (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT, channel_id TEXT, message_id TEXT, host_id TEXT, prize TEXT, winners_count INTEGER DEFAULT 1, entries TEXT DEFAULT '[]', ends_at INTEGER, ended INTEGER DEFAULT 0, created_at INTEGER DEFAULT (unixepoch()))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS birthdays (guild_id TEXT, user_id TEXT, day INTEGER, month INTEGER, year INTEGER, PRIMARY KEY (guild_id, user_id))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS reaction_roles (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT, channel_id TEXT, message_id TEXT, emoji TEXT, role_id TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT, channel_id TEXT, user_id TEXT, subject TEXT, status TEXT DEFAULT 'open', created_at INTEGER DEFAULT (unixepoch()))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS suggestions (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT, channel_id TEXT, message_id TEXT, user_id TEXT, content TEXT, status TEXT DEFAULT 'pending', created_at INTEGER DEFAULT (unixepoch()))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS custom_commands (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT, name TEXT, response TEXT, created_by TEXT, UNIQUE(guild_id, name))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS counting (guild_id TEXT PRIMARY KEY, channel_id TEXT, current_number INTEGER DEFAULT 0, last_user_id TEXT, record INTEGER DEFAULT 0)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, channel_id TEXT, message TEXT, remind_at INTEGER, created_at INTEGER DEFAULT (unixepoch()))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS shop_items (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT, name TEXT, description TEXT, price INTEGER, role_id TEXT, emoji TEXT DEFAULT '🛍️')`);
  
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
    )
  `);

  await db.execute(`CREATE TABLE IF NOT EXISTS antinuke_alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT, user_id TEXT, type TEXT, detail TEXT, action TEXT, created_at INTEGER DEFAULT (unixepoch()))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS automod_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT, user_id TEXT, type TEXT, content TEXT, action TEXT, created_at INTEGER DEFAULT (unixepoch()))`);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_id TEXT UNIQUE NOT NULL,
      guild_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      guild_name TEXT,
      role_count INTEGER DEFAULT 0,
      channel_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  await db.execute(`CREATE TABLE IF NOT EXISTS autoroles (guild_id TEXT NOT NULL, role_id TEXT NOT NULL, type TEXT DEFAULT 'all', PRIMARY KEY (guild_id, role_id))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS reactionroles (message_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, mode TEXT DEFAULT 'button')`);
  await db.execute(`CREATE TABLE IF NOT EXISTS reactionrole_items (message_id TEXT NOT NULL, role_id TEXT NOT NULL, label TEXT, emoji TEXT, PRIMARY KEY (message_id, role_id))`);

  console.log(" ✅ Connecté à Turso avec succès !");
}
