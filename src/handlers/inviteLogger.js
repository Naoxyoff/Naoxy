const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const inviteCache = new Map();
const configPath = path.join(__dirname, "../../data/inviteLogConfig.json");

function getLogChannelId(guildId) {
  if (!fs.existsSync(configPath)) return null;
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return config[guildId] || null;
}

async function initInviteCache(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const invites = await guild.invites.fetch();
      inviteCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
    } catch (err) {
      console.error(`[InviteLogger] Erreur ${guild.name}:`, err.message);
    }
  }
  console.log(`[InviteLogger] Cache initialisé.`);
}

async function getUsedInvite(member) {
  const guild = member.guild;
  try {
    const newInvites = await guild.invites.fetch();
    const cachedInvites = inviteCache.get(guild.id) || new Map();
    const usedInvite = newInvites.find(invite => {
      const oldUses = cachedInvites.get(invite.code) ?? 0;
      return invite.uses > oldUses;
    });
    inviteCache.set(guild.id, new Map(newInvites.map(i => [i.code, i.uses])));
    return usedInvite || null;
  } catch (err) {
    console.error("[InviteLogger] Erreur détection invite:", err.message);
    return null;
  }
}

async function logInvite(member) {
  const guild = member.guild;
  const channelId = getLogChannelId(guild.id);
  if (!channelId) return;

  const logChannel = guild.channels.cache.get(channelId);
  if (!logChannel) return;

  const usedInvite = await getUsedInvite(member);

  const embed = new EmbedBuilder()
    .setTitle("📥 Nouveau membre rejoint")
    .setColor(0x5865f2)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: "👤 Membre", value: `${member} (${member.user.tag})\nID: \`${member.id}\``, inline: false },
      { name: "📨 Invite utilisée", value: usedInvite ? `\`${usedInvite.code}\`` : "Inconnue", inline: true },
      { name: "👑 Invité par", value: usedInvite?.inviter ? `${usedInvite.inviter} (${usedInvite.inviter.tag})` : "Inconnu", inline: true },
      { name: "🔢 Utilisations", value: usedInvite ? `${usedInvite.uses}` : "N/A", inline: true },
      { name: "📅 Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
      { name: "👥 Membres total", value: `${guild.memberCount}`, inline: true }
    )
    .setFooter({ text: guild.name, iconURL: guild.iconURL() })
    .setTimestamp();

  await logChannel.send({ embeds: [embed] });
}

module.exports = { initInviteCache, logInvite };
