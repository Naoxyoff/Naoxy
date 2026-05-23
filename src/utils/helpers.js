const { EmbedBuilder } = require("discord.js");

const COLORS = {
  primary: 0x5865f2, success: 0x57f287, error: 0xed4245,
  warning: 0xfee75c, info: 0x3498db, gold: 0xf1c40f, purple: 0x9b59b6,
};

const successEmbed = (title, desc) => { const e = new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${title}`); if (desc) e.setDescription(desc); return e; };
const errorEmbed = (title, desc) => { const e = new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${title}`); if (desc) e.setDescription(desc); return e; };
const infoEmbed = (title, desc) => { const e = new EmbedBuilder().setColor(COLORS.primary).setTitle(`ℹ️ ${title}`); if (desc) e.setDescription(desc); return e; };
const warnEmbed = (title, desc) => { const e = new EmbedBuilder().setColor(COLORS.warning).setTitle(`⚠️ ${title}`); if (desc) e.setDescription(desc); return e; };

function hasPermission(member, permission) { return member.permissions.has(permission); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function formatMoney(amount) { return amount.toLocaleString("fr-FR") + " 💰"; }
function progressBar(current, max, length = 10) {
  const filled = Math.round((current / max) * length);
  return "█".repeat(filled) + "░".repeat(length - filled);
}
function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d|j)$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  switch (match[2].toLowerCase()) {
    case "s": return val; case "m": return val * 60;
    case "h": return val * 3600; case "d": case "j": return val * 86400;
  }
}
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}j`;
}

module.exports = { COLORS, successEmbed, errorEmbed, infoEmbed, warnEmbed, hasPermission, randomInt, formatMoney, progressBar, parseDuration, formatDuration };
