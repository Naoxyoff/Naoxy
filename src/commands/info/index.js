const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Affiche des informations")
    .addSubcommand(s =>
      s.setName("utilisateur")
        .setDescription("Afficher les informations d'un utilisateur")
        .addUserOption(o => o.setName("utilisateur").setDescription("Mention ou ID Discord de l'utilisateur").setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "utilisateur") {
      const user = interaction.options.getUser("utilisateur");
      const member = interaction.guild.members.cache.get(user.id);

      const roles = member
        ? member.roles.cache.filter(r => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position).map(r => `${r}`).join(', ') || 'Aucun'
        : 'Membre hors serveur';

      const embed = new EmbedBuilder()
        .setColor('#7c3aed')
        .setTitle(`Informations sur ${user.username}`)
        .setDescription(`Voici les informations concernant l'utilisateur ${user} (\`${user.username}\`).`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
        .addFields(
          { name: 'Mention', value: `${user}`, inline: true },
          { name: 'Identifiant', value: `\`${user.id}\``, inline: true },
          { name: '\u200b', value: '\u200b', inline: true },
          { name: 'Création du compte', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>\n→ <t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        );

      if (member?.joinedTimestamp) {
        embed.addFields({ name: 'Date d\'arrivée', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n→ <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true });
      }

      if (member) {
        embed.addFields({ name: `Rôles [${member.roles.cache.size - 1}]`, value: roles.length > 1024 ? roles.slice(0, 1020) + '...' : roles, inline: false });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
