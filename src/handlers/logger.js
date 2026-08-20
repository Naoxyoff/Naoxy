const { EmbedBuilder } = require('discord.js');
const db = require('../database/db.js').default || require('../database/db.js');

function getSettings(guildId) {
  return db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
}

function logMessageUpdate(oldMessage, newMessage) {
  if (!oldMessage.guild || oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  const settings = getSettings(oldMessage.guild.id);
  const channelId = settings?.log_messages_channel;
  if (!channelId) return;
  const ch = oldMessage.guild.channels.cache.get(channelId);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle('✏️ Message modifié')
    .setDescription(`**Salon :** ${oldMessage.channel}\n**Auteur :** ${oldMessage.author}`)
    .addFields(
      { name: 'Avant', value: (oldMessage.content || '*vide*').slice(0, 1000) },
      { name: 'Après', value: (newMessage.content || '*vide*').slice(0, 1000) }
    )
    .setTimestamp();

  ch.send({ embeds: [embed] }).catch(() => {});
}

function logMessageDelete(message) {
  if (!message.guild || message.author?.bot) return;
  const settings = getSettings(message.guild.id);
  const channelId = settings?.log_messages_channel;
  if (!channelId) return;
  const ch = message.guild.channels.cache.get(channelId);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle('🗑️ Message supprimé')
    .setDescription(`**Salon :** ${message.channel}\n**Auteur :** ${message.author}\n\n${(message.content || '*vide*').slice(0, 1500)}`)
    .setTimestamp();

  ch.send({ embeds: [embed] }).catch(() => {});
}

function logChannelCreate(channel) {
  if (!channel.guild) return;
  const settings = getSettings(channel.guild.id);
  const channelId = settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = channel.guild.channels.cache.get(channelId);
  if (!ch) return;

  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0x10b981)
    .setDescription(`📁 Salon créé : **${channel.name}**`)
    .setTimestamp()] }).catch(() => {});
}

function logChannelDelete(channel) {
  if (!channel.guild) return;
  const settings = getSettings(channel.guild.id);
  const channelId = settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = channel.guild.channels.cache.get(channelId);
  if (!ch) return;

  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0xef4444)
    .setDescription(`🗑️ Salon supprimé : **${channel.name}**`)
    .setTimestamp()] }).catch(() => {});
}

module.exports = {
  logChannelCreate,
  logChannelDelete,
  logMessageUpdate,
  logMessageDelete
};
