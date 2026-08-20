const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { default: db } = require("../../database/db.js");
const { successEmbed, errorEmbed, warnEmbed, COLORS, parseDuration, formatDuration } = require("../../utils/helpers.js");

async function logAction(interaction, action, targetId, reason) {
  const settingsRes = await db.execute({ sql: "SELECT log_channel FROM guild_settings WHERE guild_id = ?", args: [interaction.guildId] });
  const settings = settingsRes.rows[0];
  if (!settings?.log_channel) return;
  const channel = interaction.guild?.channels.cache.get(settings.log_channel);
  if (!channel) return;
  const typeEmoji = { warn: "⚠️", kick: "👢", ban: "🔨", mute: "🔇" };
  await channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle(`${typeEmoji[action] ?? "🔒"} ${action.toUpperCase()} | Log`).addFields({ name: "Cible", value: `<@${targetId}>`, inline: true }, { name: "Modérateur", value: `${interaction.user}`, inline: true }, { name: "Raison", value: reason }).setTimestamp()] });
}

const commands = [
  {
    data: new SlashCommandBuilder().setName("warn").setDescription("Avertir un membre").addUserOption(o => o.setName("membre").setDescription("Le membre").setRequired(true)).addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const target = interaction.options.getUser("membre", true);
      const reason = interaction.options.getString("raison") ?? "Aucune raison";
      await db.execute({ sql: "INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)", args: [interaction.guildId, target.id, interaction.user.id, reason] });
      await db.execute({ sql: "INSERT INTO sanctions (guild_id, user_id, moderator_id, type, reason) VALUES (?, ?, ?, 'warn', ?)", args: [interaction.guildId, target.id, interaction.user.id, reason] });
      
      const warnsRes = await db.execute({ sql: "SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?", args: [interaction.guildId, target.id] });
      const warns = warnsRes.rows[0];

      try { await target.send({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle(`⚠️ Avertissement sur ${interaction.guild?.name}`).addFields({ name: "Raison", value: reason })] }); } catch (_) {}
      await logAction(interaction, "warn", target.id, reason);
      await interaction.reply({ embeds: [successEmbed("Avertissement envoyé", `${target} averti. **${warns.count}** avertissement(s).\n**Raison :** ${reason}`)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("warnings").setDescription("Voir les avertissements d'un membre").addUserOption(o => o.setName("membre").setDescription("Le membre").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const target = interaction.options.getUser("membre", true);
      const warnsRes = await db.execute({ sql: "SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 10", args: [interaction.guildId, target.id] });
      const warns = warnsRes.rows;
      const embed = new EmbedBuilder().setColor(COLORS.warning).setTitle(`⚠️ Avertissements de ${target.tag}`).setThumbnail(target.displayAvatarURL());
      embed.setDescription(warns.length === 0 ? "Aucun avertissement." : warns.map((w, i) => `**#${i+1}** — <@${w.moderator_id}> • <t:${w.created_at}:R>\n> ${w.reason}`).join("\n\n"));
      await interaction.reply({ embeds: [embed] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("clearwarn").setDescription("Supprimer les avertissements").addUserOption(o => o.setName("membre").setDescription("Le membre").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const target = interaction.options.getUser("membre", true);
      await db.execute({ sql: "DELETE FROM warnings WHERE guild_id = ? AND user_id = ?", args: [interaction.guildId, target.id] });
      await interaction.reply({ embeds: [successEmbed("Avertissements supprimés", `Les avertissements de ${target} ont été supprimés.`)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("kick").setDescription("Expulser un membre").addUserOption(o => o.setName("membre").setDescription("Le membre").setRequired(true)).addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
      const target = interaction.options.getMember("membre");
      const reason = interaction.options.getString("raison") ?? "Aucune raison";
      if (!target || !target.kickable) return interaction.reply({ embeds: [errorEmbed("Impossible d'expulser ce membre.")], ephemeral: true });
      try { await target.send({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle(`👢 Expulsé de ${interaction.guild?.name}`).addFields({ name: "Raison", value: reason })] }); } catch (_) {}
      await target.kick(reason);
      await db.execute({ sql: "INSERT INTO sanctions (guild_id, user_id, moderator_id, type, reason) VALUES (?, ?, ?, 'kick', ?)", args: [interaction.guildId, target.id, interaction.user.id, reason] });
      await logAction(interaction, "kick", target.id, reason);
      await interaction.reply({ embeds: [successEmbed("Membre expulsé", `${target.user} expulsé.\n**Raison :** ${reason}`)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("ban").setDescription("Bannir un membre").addUserOption(o => o.setName("membre").setDescription("Le membre").setRequired(true)).addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)).addStringOption(o => o.setName("duree").setDescription("Durée ex: 1d, 7j").setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
      const target = interaction.options.getUser("membre", true);
      const reason = interaction.options.getString("raison") ?? "Aucune raison";
      const dureeStr = interaction.options.getString("duree");
      let duration = null;
      if (dureeStr && dureeStr !== "permanent") { duration = parseDuration(dureeStr); if (!duration) return interaction.reply({ embeds: [errorEmbed("Format invalide")], ephemeral: true }); }
      try { await target.send({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle(`🔨 Banni de ${interaction.guild?.name}`).addFields({ name: "Raison", value: reason }, { name: "Durée", value: duration ? formatDuration(duration) : "Permanent" })] }); } catch (_) {}
      await interaction.guild?.members.ban(target, { reason });
      await db.execute({ sql: "INSERT INTO sanctions (guild_id, user_id, moderator_id, type, reason, duration, expires_at) VALUES (?, ?, ?, 'ban', ?, ?, ?)", args: [interaction.guildId, target.id, interaction.user.id, reason, duration, duration ? Math.floor(Date.now()/1000)+duration : null] });
      await logAction(interaction, "ban", target.id, reason);
      await interaction.reply({ embeds: [successEmbed("Membre banni", `${target} banni${duration ? ` pour ${formatDuration(duration)}` : " définitivement"}.\n**Raison :** ${reason}`)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("unban").setDescription("Débannir un utilisateur").addStringOption(o => o.setName("user_id").setDescription("ID de l'utilisateur").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
      const userId = interaction.options.getString("user_id", true);
      try { await interaction.guild?.members.unban(userId); await interaction.reply({ embeds: [successEmbed("Débanni", `\`${userId}\` a été débanni.`)] }); }
      catch { await interaction.reply({ embeds: [errorEmbed("Utilisateur introuvable ou non banni.")], ephemeral: true }); }
    }
  },
  {
    data: new SlashCommandBuilder().setName("unbanall").setDescription("Débannir tous les utilisateurs").setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
      await interaction.deferReply();
      const bans = await interaction.guild.bans.fetch();
      let count = 0;
      for (const [, ban] of bans) {
        try { await interaction.guild.members.unban(ban.user.id, "Unban all"); count++; await new Promise(r => setTimeout(r, 500)); } catch {}
      }
      await interaction.editReply({ embeds: [successEmbed("✅ Unban all !", `**${count}** utilisateur(s) débanni(s).`)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("mute").setDescription("Mettre en sourdine un membre").addUserOption(o => o.setName("membre").setDescription("Le membre").setRequired(true)).addStringOption(o => o.setName("duree").setDescription("Durée ex: 10m, 1h, 1d").setRequired(true)).addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const target = interaction.options.getMember("membre");
      const dureeStr = interaction.options.getString("duree", true);
      const reason = interaction.options.getString("raison") ?? "Aucune raison";
      const duration = parseDuration(dureeStr);
      if (!duration) return interaction.reply({ embeds: [errorEmbed("Format invalide. Ex: 10m, 2h, 1d")], ephemeral: true });
      if (duration > 28*86400) return interaction.reply({ embeds: [errorEmbed("Maximum 28 jours.")], ephemeral: true });
      await target.timeout(duration * 1000, reason);
      await db.execute({ sql: "INSERT INTO sanctions (guild_id, user_id, moderator_id, type, reason, duration) VALUES (?, ?, ?, 'mute', ?, ?)", args: [interaction.guildId, target.id, interaction.user.id, reason, duration] });
      await logAction(interaction, "mute", target.id, reason);
      await interaction.reply({ embeds: [successEmbed("Mis en sourdine", `${target} en sourdine pour **${formatDuration(duration)}**.\n**Raison :** ${reason}`)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("unmute").setDescription("Retirer la sourdine").addUserOption(o => o.setName("membre").setDescription("Le membre").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const target = interaction.options.getMember("membre");
      await target.timeout(null);
      await interaction.reply({ embeds: [successEmbed("Sourdine levée", `${target} peut à nouveau écrire.`)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("sanctions").setDescription("Voir les sanctions d'un membre").addUserOption(o => o.setName("membre").setDescription("Le membre").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const target = interaction.options.getUser("membre", true);
      const listRes = await db.execute({ sql: "SELECT * FROM sanctions WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 15", args: [interaction.guildId, target.id] });
      const list = listRes.rows;
      const typeEmoji = { warn: "⚠️", mute: "🔇", kick: "👢", ban: "🔨" };
      const embed = new EmbedBuilder().setColor(COLORS.error).setTitle(`🔨 Sanctions de ${target.tag}`).setThumbnail(target.displayAvatarURL());
      embed.setDescription(list.length === 0 ? "Aucune sanction." : list.map(s => `${typeEmoji[s.type] ?? "🔒"} **${s.type.toUpperCase()}** — <t:${s.created_at}:R> — <@${s.moderator_id}>\n> ${s.reason}`).join("\n\n"));
      await interaction.reply({ embeds: [embed] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("slowmode").setDescription("Définir le slowmode").addIntegerOption(o => o.setName("secondes").setDescription("Secondes (0 = désactiver)").setMinValue(0).setMaxValue(21600).setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      const secs = interaction.options.getInteger("secondes", true);
      await interaction.channel.setRateLimitPerUser(secs);
      await interaction.reply({ embeds: [successEmbed(secs === 0 ? "Slowmode désactivé" : "Slowmode activé", secs > 0 ? `Un message toutes les **${secs}s**.` : undefined)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("lock").setDescription("Verrouiller le salon").addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      await interaction.reply({ embeds: [warnEmbed("Salon verrouillé 🔒", interaction.options.getString("raison") ?? "Salon verrouillé")] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("unlock").setDescription("Déverrouiller le salon").setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
      await interaction.reply({ embeds: [successEmbed("Salon déverrouillé 🔓")] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("clear").setDescription("Supprimer des messages").addIntegerOption(o => o.setName("nombre").setDescription("Nombre (1-500)").setMinValue(1).setMaxValue(500).setRequired(true)).addUserOption(o => o.setName("membre").setDescription("Seulement ce membre").setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      const amount = interaction.options.getInteger("nombre", true);
      const target = interaction.options.getUser("membre");
      await interaction.deferReply({ flags: 64 });
      let deleted = 0;
      let remaining = amount;
      while (remaining > 0) {
        const fetchLimit = Math.min(remaining, 100);
        const messages = await interaction.channel.messages.fetch({ limit: fetchLimit });
        if (messages.size === 0) break;
        let toDelete = [...messages.values()];
        if (target) toDelete = toDelete.filter(m => m.author.id === target.id);
        if (toDelete.length === 0) break;
        const bulked = await interaction.channel.bulkDelete(toDelete, true).catch(() => new Map());
        deleted += bulked.size;
        remaining -= bulked.size;
        if (bulked.size < fetchLimit) break;
        await new Promise(r => setTimeout(r, 1000));
      }
      await interaction.editReply({ embeds: [successEmbed("Messages supprimés", `**${deleted}** message(s) supprimé(s).`)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("logconfig").setDescription("Configurer le salon des logs").addChannelOption(o => o.setName("salon").setDescription("Salon des logs").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const channel = interaction.options.getChannel("salon", true);
      
      const existingRes = await db.execute({ sql: "SELECT guild_id FROM guild_settings WHERE guild_id = ?", args: [interaction.guildId] });
      if (existingRes.rows.length > 0) {
        await db.execute({ sql: "UPDATE guild_settings SET log_channel = ? WHERE guild_id = ?", args: [channel.id, interaction.guildId] });
      } else {
        await db.execute({ sql: "INSERT INTO guild_settings (guild_id, log_channel) VALUES (?, ?)", args: [interaction.guildId, channel.id] });
      }
      await interaction.reply({ embeds: [successEmbed("Logs configurés", `Les logs seront envoyés dans ${channel}.`)] });
    }
  }
];

module.exports = commands;