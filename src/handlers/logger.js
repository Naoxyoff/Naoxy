const { EmbedBuilder } = require('discord.js');
const db = require('../database/db.js').default || require('../database/db.js');

async function getSettings(guildId) {
  const res = await db.execute({ sql: 'SELECT * FROM guild_settings WHERE guild_id = ?', args: [guildId] });
  return res.rows[0] || null;
}

// ── 1. LOGS MESSAGES ──
async function logMessageUpdate(oldMessage, newMessage) {
  if (!oldMessage.guild || oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  const settings = await getSettings(oldMessage.guild.id);
  const channelId = settings?.log_messages_channel || settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = oldMessage.guild.channels.cache.get(channelId);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0xF59E0B) // Orange/Jaune modification
    .setAuthor({ name: "✏️ Modification d'un message", iconURL: oldMessage.author.displayAvatarURL({ dynamic: true }) })
    .setDescription(`**Auteur :** ${oldMessage.author} (\`${oldMessage.author.tag}\`)\n**Salon :** ${oldMessage.channel}`)
    .addFields(
      { name: '💬 Avant', value: (oldMessage.content || '*[Média ou embed]*').slice(0, 1024), inline: false },
      { name: '💬 Après', value: (newMessage.content || '*[Média ou embed]*').slice(0, 1024), inline: false }
    )
    .setTimestamp();

  ch.send({ embeds: [embed] }).catch(() => {});
}

async function logMessageDelete(message) {
  if (!message.guild || message.author?.bot) return;
  const settings = await getSettings(message.guild.id);
  const channelId = settings?.log_messages_channel || settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = message.guild.channels.cache.get(channelId);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0xEF4444) // Rouge suppression
    .setAuthor({ name: "🗑️ Suppression d'un message", iconURL: message.author?.displayAvatarURL({ dynamic: true }) })
    .setDescription(`**Auteur :** ${message.author || 'Inconnu'}\n**Salon :** ${message.channel}\n\n**Contenu :**\n${(message.content || '*[Aucun contenu textuel]*').slice(0, 1500)}`)
    .setTimestamp();

  ch.send({ embeds: [embed] }).catch(() => {});
}

// ── 2. LOGS SERVEUR (Salons, Rôles, Pseudos, Membres) ──
async function logChannelCreate(channel) {
  if (!channel.guild) return;
  const settings = await getSettings(channel.guild.id);
  const channelId = settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = channel.guild.channels.cache.get(channelId);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0x10B981) // Vert création
    .setTitle("📁 Création d'un salon")
    .setDescription(`**Nom :** \`${channel.name}\`\n**Type :** ${channel.type}\n**Catégorie :** ${channel.parent ? channel.parent.name : 'Aucune'}`)
    .setTimestamp();

  ch.send({ embeds: [embed] }).catch(() => {});
}

async function logChannelDelete(channel) {
  if (!channel.guild) return;
  const settings = await getSettings(channel.guild.id);
  const channelId = settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = channel.guild.channels.cache.get(channelId);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0xEF4444) // Rouge suppression
    .setTitle("🗑️ Suppression d'un salon")
    .setDescription(`**Nom :** \`${channel.name}\`\n**Type :** ${channel.type}`)
    .setTimestamp();

  ch.send({ embeds: [embed] }).catch(() => {});
}

async function logRoleDelete(role) {
  if (!role.guild) return;
  const settings = await getSettings(role.guild.id);
  const channelId = settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = role.guild.channels.cache.get(channelId);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0xEF4444)
    .setTitle("🗑️ Suppression d'un rôle")
    .setDescription(`**Nom du rôle :** \`${role.name}\``)
    .setTimestamp();

  ch.send({ embeds: [embed] }).catch(() => {});
}

async function logMemberUpdate(oldMember, newMember) {
  if (!newMember.guild) return;
  const settings = await getSettings(newMember.guild.id);
  const channelId = settings?.log_serveur_channel;
  if (!channelId) return;
  const ch = newMember.guild.channels.cache.get(channelId);
  if (!ch) return;

  // Changement de pseudo
  if (oldMember.nickname !== newMember.nickname) {
    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setAuthor({ name: "✏️ Modification de pseudo", iconURL: newMember.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(`**Membre :** ${newMember.user}\n**Ancien :** \`${oldMember.nickname || oldMember.user.username}\`\n**Nouveau :** \`${newMember.nickname || newMember.user.username}\``)
      .setTimestamp();
    ch.send({ embeds: [embed] }).catch(() => {});
  }

  // Rôles ajoutés
  const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  if (addedRoles.size > 0) {
    const embed = new EmbedBuilder()
      .setColor(0x10B981) // Vert
      .setAuthor({ name: "➕ Rôle(s) attribué(s)", iconURL: newMember.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(`**Membre :** ${newMember.user}\n**Rôle(s) :** ${addedRoles.map(r => `\`${r.name}\``).join(', ')}`)
      .setTimestamp();
    ch.send({ embeds: [embed] }).catch(() => {});
  }

  // Rôles retirés
  const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
  if (removedRoles.size > 0) {
    const embed = new EmbedBuilder()
      .setColor(0xEF4444) // Rouge
      .setAuthor({ name: "➖ Rôle(s) retiré(s)", iconURL: newMember.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(`**Membre :** ${newMember.user}\n**Rôle(s) :** ${removedRoles.map(r => `\`${r.name}\``).join(', ')}`)
      .setTimestamp();
    ch.send({ embeds: [embed] }).catch(() => {});
  }
}

// ── 3. LOGS VOCAUX (Entrées, Sorties, Déplacements) ──
async function logVoiceStateUpdate(oldState, newState) {
  const guild = newState.guild || oldState.guild;
  if (!guild) return;
  const settings = await getSettings(guild.id);
  const channelId = settings?.log_channel;
  if (!channelId) return;
  const ch = guild.channels.cache.get(channelId);
  if (!ch) return;

  const member = newState.member;
  if (!member || member.user.bot) return;

  // Connexion à un salon vocal
  if (!oldState.channel && newState.channel) {
    const embed = new EmbedBuilder()
      .setColor(0x3B82F6) // Bleu vocal
      .setAuthor({ name: "🔊 Connexion Vocale", iconURL: member.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(`**Membre :** ${member} (\`${member.user.tag}\`)\n**Salon :** \`${newState.channel.name}\``)
      .setTimestamp();
    return ch.send({ embeds: [embed] }).catch(() => {});
  }

  // Déconnexion d'un salon vocal
  if (oldState.channel && !newState.channel) {
    const embed = new EmbedBuilder()
      .setColor(0x6B7280) // Gris déconnexion
      .setAuthor({ name: "🔇 Déconnexion Vocale", iconURL: member.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(`**Membre :** ${member} (\`${member.user.tag}\`)\n**Salon quitté :** \`${oldState.channel.name}\``)
      .setTimestamp();
    return ch.send({ embeds: [embed] }).catch(() => {});
  }

  // Changement de salon vocal
  if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6) // Violet déplacement
      .setAuthor({ name: "🔀 Déplacement Vocal", iconURL: member.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(`**Membre :** ${member} (\`${member.user.tag}\`)\n**De :** \`${oldState.channel.name}\`\n**Vers :** \`${newState.channel.name}\``)
      .setTimestamp();
    return ch.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = {
  logChannelCreate,
  logChannelDelete,
  logMessageUpdate,
  logMessageDelete,
  logRoleDelete,
  logMemberUpdate,
  logVoiceStateUpdate
};
