const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../database/db.js").default || require("../../database/db.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("invites")
    .setDescription("Voir le nombre d'invitations")
    .addSubcommand(s => s.setName("voir").setDescription("Voir les invitations d'un membre")
      .addUserOption(o => o.setName("membre").setDescription("Le membre (toi par défaut)").setRequired(false)))
    .addSubcommand(s => s.setName("classement").setDescription("Voir le classement des inviteurs")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId;

    if (sub === "voir") {
      const user = interaction.options.getUser("membre") || interaction.user;
      const res = await db.execute({ sql: "SELECT count FROM invite_stats WHERE guild_id = ? AND inviter_id = ?", args: [gid, user.id] });
      const count = res.rows[0]?.count || 0;

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#7c3aed')
          .setDescription(`📨 **${user.username}** a invité **${count}** membre(s) sur ce serveur.`)],
        ephemeral: true
      });

    } else if (sub === "classement") {
      const res = await db.execute({ sql: "SELECT * FROM invite_stats WHERE guild_id = ? ORDER BY count DESC LIMIT 10", args: [gid] });
      const rows = res.rows;
      if (!rows.length) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#7c3aed').setDescription("Aucune invitation enregistrée pour l'instant.")], ephemeral: true });
      }
      const medals = ['🥇', '🥈', '🥉'];
      const desc = rows.map((r, i) => `${medals[i] || `**${i + 1}.**`} <@${r.inviter_id}> — **${r.count}** invitation(s)`).join('\n');

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor('#7c3aed').setTitle('🏆 Classement des inviteurs').setDescription(desc)],
        ephemeral: true
      });
    }
  }
};
