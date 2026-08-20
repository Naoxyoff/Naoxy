const { EmbedBuilder } = require("discord.js");
const { db } = require("../database/db.js");

function getSettings(guildId) {
  return db.prepare("SELECT * FROM guild_settings WHERE guild_id = ?").get(guildId);
}

function formatMsg(template, member) {
  return (template || "")
    .replace(/{user}/g, `<@${member.user.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{membercount}/g, member.guild.memberCount)
    .replace(/{count}/g, member.guild.memberCount)
    .replace(/{guild}/g, member.guild.name);
}

async function sendWelcome(member) {
  const s = getSettings(member.guild.id);
  if (!s?.welcome_channel) return;
  const ch = member.guild.channels.cache.get(s.welcome_channel);
  if (!ch) return;
  
  const msg = formatMsg(s.welcome_message || "🎉 Bienvenue {user} sur **{server}** ! Tu es le **{count}**ème membre !", member);
  const title = s.welcome_title || "Ho ! Un nouveau membre ! 🎉";

  const embed = new EmbedBuilder()
    .setColor(0x10b981) // Vert
    .setTitle(title)
    .setDescription(msg)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  if (s.welcome_image) embed.setImage(s.welcome_image);

  await ch.send({ embeds: [embed] }).catch(() => {});
}

async function sendLeave(member) {
  const s = getSettings(member.guild.id);
  if (!s?.leave_channel) return;
  const ch = member.guild.channels.cache.get(s.leave_channel);
  if (!ch) return;
  
  const msg = formatMsg(s.leave_message || "Au revoir **{username}** ! On espère te revoir sur **{server}** 👋", member);
  const title = s.leave_title || "Un membre vient de partir... 😥";

  const joinedDaysAgo = member.joinedTimestamp
    ? Math.floor((Date.now() - member.joinedTimestamp) / 86400000)
    : null;
    
  const footerText = joinedDaysAgo !== null 
    ? `A quitté le serveur • Était là depuis ${joinedDaysAgo} jour(s)` 
    : `A quitté le serveur`;

  const embed = new EmbedBuilder()
    .setColor(0xef4444) // Rouge
    .setTitle(title)
    .setDescription(msg)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: footerText })
    .setTimestamp();

  if (s.leave_image) embed.setImage(s.leave_image);

  await ch.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { sendWelcome, sendLeave };
