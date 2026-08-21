const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("../../database/db.js").default || require("../../database/db.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setinvitelog")
    .setDescription("Définir le salon pour les logs d'invitations")
    .addChannelOption(option =>
      option.setName("salon")
        .setDescription("Le salon où envoyer les logs")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel("salon");
    const gid = interaction.guildId;

    const existing = await db.execute({ sql: "SELECT guild_id FROM guild_settings WHERE guild_id = ?", args: [gid] });
    if (existing.rows.length > 0) {
      await db.execute({ sql: "UPDATE guild_settings SET invite_log_channel = ? WHERE guild_id = ?", args: [channel.id, gid] });
    } else {
      await db.execute({ sql: "INSERT INTO guild_settings (guild_id, invite_log_channel) VALUES (?, ?)", args: [gid, channel.id] });
    }

    const embed = new EmbedBuilder()
      .setTitle("✅ Invite Logger configuré")
      .setColor(0x57f287)
      .setDescription(`Les logs d'invitations seront envoyés dans ${channel}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
