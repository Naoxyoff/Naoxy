const db = require('../database/db.js');

function getLogChannels(guildId) {
  if (!db || typeof db.prepare !== 'function') return [];
  try {
    return db.prepare('SELECT channel_id FROM log_channels WHERE guild_id = ?').all(guildId);
  } catch (err) {
    return [];
  }
}

function logChannelCreate(channel) {
  const channels = getLogChannels(channel.guild?.id);
  if (!channels.length) return;
}

function logChannelDelete(channel) {
  const channels = getLogChannels(channel.guild?.id);
  if (!channels.length) return;
}

function logMessageUpdate(oldMessage, newMessage) {
  if (!oldMessage.guild) return;
  const channels = getLogChannels(oldMessage.guild.id);
  if (!channels.length) return;
}

function logMessageDelete(message) {
  if (!message.guild) return;
  const channels = getLogChannels(message.guild.id);
  if (!channels.length) return;
}

module.exports = {
  logChannelCreate,
  logChannelDelete,
  logMessageUpdate,
  logMessageDelete
};
