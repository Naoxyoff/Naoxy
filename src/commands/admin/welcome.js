const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { db } = require("../../database/db.js");
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
      
      const existingRes = db.prepare("SELECT guild_id FROM guild_settings WHERE guild_id = ?").get(gid);
      if (existingRes) {
        db.prepare("UPDATE guild_settings SET welcome_channel = ?, welcome_message = ? WHERE guild_id = ?").run(channel.id, msg, gid);
      } else {
        db.prepare("INSERT INTO guild_settings (guild_id, welcome_channel, welcome_message) VALUES (?, ?, ?)").run(gid, channel.id, msg);
      }
      await interaction.reply({ embeds: [successEmbed("Message d'arrivée configuré !", `Salon : ${channel}\nMessage : ${msg}`)] });

    } else if (sub === "depart") {
      const channel = interaction.options.getChannel("salon", true);
      const msg = interaction.options.getString("message") ?? "Au revoir **{user}** ! On espère te revoir sur **{guild}** 👋";
      
      const existingRes = db.prepare("SELECT guild_id FROM guild_settings WHERE guild_id = ?").get(gid);
      if (existingRes) {
        db.prepare("UPDATE guild_settings SET leave_channel = ?, leave_message = ? WHERE guild_id = ?").run(channel.id, msg, gid);
      } else {
        db.prepare("INSERT INTO guild_settings (guild_id, leave_channel, leave_message) VALUES (?, ?, ?)").run(gid, channel.id, msg);
      }
      await interaction.reply({ embeds: [successEmbed("Message de départ configuré !", `Salon : ${channel}\nMessage : ${msg}`)] });

    } else if (sub === "test") {
      const settings = db.prepare("SELECT welcome_channel, welcome_message, welcome_title, welcome_image FROM guild_settings WHERE guild_id = ?").get(gid) || {};
      if (!settings.welcome_channel) return interaction.reply({ embeds: [errorEmbed("Aucun salon d'arrivée configuré.")], ephemeral: true });
      const ch = interaction.guild?.channels.cache.get(settings.welcome_channel);
      if (!ch) return interaction.reply({ embeds: [errorEmbed("Salon introuvable.")], ephemeral: true });
      
      const msg = (settings.welcome_message ?? "Bienvenue {user} sur **{guild}** ! Tu es le **{count}**ème membre ! 🎉")
        .replace(/{user}/g, interaction.user.toString())
        .replace(/{guild}/g, interaction.guild?.name ?? "")
        .replace(/{count}/g, `${interaction.guild?.memberCount}`);
        
      const title = settings.welcome_title || "Ho ! Un nouveau membre !";

      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle(title)
        .setDescription(msg)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
        .setTimestamp();

      if (settings.welcome_image) embed.setImage(settings.welcome_image);

      await ch.send({ embeds: [embed] });
      await interaction.reply({ embeds: [successEmbed("Message de test envoyé !")], ephemeral: true });

    } else if (sub === "disable") {
      db.prepare("UPDATE guild_settings SET welcome_channel = NULL, leave_channel = NULL WHERE guild_id = ?").run(gid);
      await interaction.reply({ embeds: [successEmbed("Messages de bienvenue désactivés.")] });
    }
  }
};
