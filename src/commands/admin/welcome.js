const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { db, getGuildSettings } = require("../../database/db.js");
const { successEmbed, errorEmbed, COLORS } = require("../../utils/helpers.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configurer les messages de bienvenue et départ")
    .addSubcommand(s => s.setName("arrivee").setDescription("Configurer le message d'arrivée")
      .addChannelOption(o => o.setName("salon").setDescription("Salon d'arrivée").setRequired(true))
      .addStringOption(o => o.setName("message").setDescription("Message (variables: {user} {guild} {count})").setRequired(false)))
    .addSubcommand(s => s.setName("depart").setDescription("Configurer le message de départ")
      .addChannelOption(o => o.setName("salon").setDescription("Salon de départ").setRequired(true))
      .addStringOption(o => o.setName("message").setDescription("Message (variables: {user} {guild})").setRequired(false)))
    .addSubcommand(s => s.setName("test").setDescription("Tester le message d'arrivée"))
    .addSubcommand(s => s.setName("disable").setDescription("Désactiver les messages de bienvenue"))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId;

    if (sub === "arrivee") {
      const channel = interaction.options.getChannel("salon", true);
      const msg = interaction.options.getString("message") ?? "Bienvenue {user} sur **{guild}** ! Tu es le **{count}**ème membre ! 🎉";
      db.prepare("INSERT INTO guild_settings (guild_id, welcome_channel, welcome_message) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET welcome_channel=?, welcome_message=?")
        .run(gid, channel.id, msg, channel.id, msg);
      await interaction.reply({ embeds: [successEmbed("Message d'arrivée configuré !", `Salon : ${channel}\nMessage : ${msg}`)] });

    } else if (sub === "depart") {
      const channel = interaction.options.getChannel("salon", true);
      const msg = interaction.options.getString("message") ?? "Au revoir **{user}** ! On espère te revoir sur **{guild}** 👋";
      db.prepare("INSERT INTO guild_settings (guild_id, leave_channel, leave_message) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET leave_channel=?, leave_message=?")
        .run(gid, channel.id, msg, channel.id, msg);
      await interaction.reply({ embeds: [successEmbed("Message de départ configuré !", `Salon : ${channel}\nMessage : ${msg}`)] });

    } else if (sub === "test") {
      const settings = getGuildSettings(gid);
      if (!settings.welcome_channel) return interaction.reply({ embeds: [errorEmbed("Aucun salon d'arrivée configuré.")], ephemeral: true });
      const ch = interaction.guild?.channels.cache.get(settings.welcome_channel);
      if (!ch) return interaction.reply({ embeds: [errorEmbed("Salon introuvable.")], ephemeral: true });
      const msg = (settings.welcome_message ?? "Bienvenue {user} sur **{guild}** !")
        .replace("{user}", interaction.user.toString())
        .replace("{guild}", interaction.guild?.name ?? "")
        .replace("{count}", `${interaction.guild?.memberCount}`);
      await ch.send({ embeds: [new EmbedBuilder().setColor(COLORS.success).setDescription(msg).setThumbnail(interaction.user.displayAvatarURL()).setTimestamp()] });
      await interaction.reply({ embeds: [successEmbed("Message de test envoyé !")], ephemeral: true });

    } else if (sub === "disable") {
      db.prepare("INSERT INTO guild_settings (guild_id, welcome_channel) VALUES (?, NULL) ON CONFLICT(guild_id) DO UPDATE SET welcome_channel=NULL, leave_channel=NULL").run(gid);
      await interaction.reply({ embeds: [successEmbed("Messages de bienvenue désactivés.")] });
    }
  }
};
