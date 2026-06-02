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
  console.log(`[Welcome] guildMemberAdd déclenché pour ${member.user.tag} sur ${member.guild.name}`);
  const s = getSettings(member.guild.id);
  console.log(`[Welcome] Config:`, JSON.stringify(s));
  if (!s?.welcome_channel) { console.log(`[Welcome] Pas de welcome_channel configuré`); return; }
  const ch = member.guild.channels.cache.get(s.welcome_channel);
  if (!ch) return;
  const msg = formatMsg(s.welcome_message || "Bienvenue {user} sur **{server}** ! 🎉", member);
  await ch.send({ embeds: [new EmbedBuilder()
    .setColor(0x10b981)
    .setDescription(msg)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Membre #${member.guild.memberCount}` })
    .setTimestamp()
  ]}).catch(() => {});
}

async function sendLeave(member) {
  const s = getSettings(member.guild.id);
  if (!s?.leave_channel) return;
  const ch = member.guild.channels.cache.get(s.leave_channel);
  if (!ch) return;
  const msg = formatMsg(s.leave_message || "**{username}** a quitté le serveur. 👋", member);
  await ch.send({ embeds: [new EmbedBuilder()
    .setColor(0xef4444)
    .setDescription(msg)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Il reste ${member.guild.memberCount} membres` })
    .setTimestamp()
  ]}).catch(() => {});
}

module.exports = { sendWelcome, sendLeave };
