const { EmbedBuilder } = require('discord.js');
const db = require('../database/db.js').default || require('../database/db.js');

async function getSettings(guildId) {
  const res = await db.execute({ sql: 'SELECT * FROM guild_settings WHERE guild_id = ?', args: [guildId] });
  return res.rows[0] || null;
}

async function logMessageUpdate(oldMessage, newMessage) {
  if (!oldMessage.guild || oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  const settings = await getSettings(oldMessage.guild.id);
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

async function logMessageDelete(message) {
  if (!message.guild || message.author?.bot) return;
  const settings = await getSettings(message.guild.id);
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

async function logChannelCreate(channel) {
  if (!channel.guild) return;
  const settings = await getSettings(channel.guild.id);
  const channelId = settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = channel.guild.channels.cache.get(channelId);
  if (!ch) return;

  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0x10b981)
    .setDescription(`📁 Salon créé : **${channel.name}**`)
    .setTimestamp()] }).catch(() => {});
}

async function logChannelDelete(channel) {
  if (!channel.guild) return;
  const settings = await getSettings(channel.guild.id);
  const channelId = settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = channel.guild.channels.cache.get(channelId);
  if (!ch) return;

  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0xef4444)
    .setDescription(`🗑️ Salon supprimé : **${channel.name}**`)
    .setTimestamp()] }).catch(() => {});
}

async function logRoleDelete(role) {
  if (!role.guild) return;
  const settings = await getSettings(role.guild.id);
  const channelId = settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = role.guild.channels.cache.get(channelId);
  if (!ch) return;

  ch.send({ embeds: [new EmbedBuilder()
    .setColor(0xef4444)
    .setDescription(`🗑️ Rôle supprimé : **${role.name}**`)
    .setTimestamp()] }).catch(() => {});
}


async function logMemberUpdate(oldMember, newMember) {
  if (!newMember.guild) return;
  const settings = await getSettings(newMember.guild.id);
  const channelId = settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = newMember.guild.channels.cache.get(channelId);
  if (!ch) return;

  if (oldMember.nickname !== newMember.nickname) {
    ch.send({ embeds: [new EmbedBuilder()
      .setColor(0xf59e0b)
      .setDescription(`✏️ Pseudo modifié pour ${newMember.user} : **${oldMember.nickname || oldMember.user.username}** → **${newMember.nickname || newMember.user.username}**`)
      .setTimestamp()] }).catch(() => {});
    return;
  }

  const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

  if (addedRoles.size > 0) {
    ch.send({ embeds: [new EmbedBuilder()
      .setColor(0x10b981)
      .setDescription(`➕ Rôle(s) ajouté(s) à ${newMember.user} : ${addedRoles.map(r => r.name).join(', ')}`)
      .setTimestamp()] }).catch(() => {});
  }

  if (removedRoles.size > 0) {
    ch.send({ embeds: [new EmbedBuilder()
      .setColor(0xef4444)
      .setDescription(`➖ Rôle(s) retiré(s) à ${newMember.user} : ${removedRoles.map(r => r.name).join(', ')}`)
      .setTimestamp()] }).catch(() => {});
  }
}

module.exports = {
  logChannelCreate,
  logChannelDelete,
  logMessageUpdate,
  logMessageDelete,
  logRoleDelete,
  logMemberUpdate
};
