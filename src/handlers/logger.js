import db from '../database/db.js';

function getLogChannels(guildId) {
  if (!db || typeof db.prepare !== 'function') {
    return [];
  }
  try {
    return db.prepare('SELECT channel_id FROM log_channels WHERE guild_id = ?').all(guildId);
  } catch (err) {
    return [];
  }
}

export function logChannelCreate(channel) {
  const channels = getLogChannels(channel.guild.id);
  if (!channels.length) return;
}

export function logChannelDelete(channel) {
  const channels = getLogChannels(channel.guild.id);
  if (!channels.length) return;
}
