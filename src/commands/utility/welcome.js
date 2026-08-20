const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");
const db = require("../../database/db.js").default || require("../../database/db.js");
const { successEmbed, errorEmbed, COLORS } = require("../../utils/helpers.js");
const { createWelcomeImage } = require("../../utils/canvas.js");

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
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.options.getChannel("salon", true);
      const msg = interaction.options.getString("message") ?? "Bienvenue {user} sur **{guild}** ! Tu es le **{count}**ème membre ! 🎉";
      
      try {
        await db.exec({
          sql: "INSERT INTO guild_settings (guild_id, welcome_channel, welcome_message) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET welcome_channel = ?, welcome_message = ?",
          args: [gid, channel.id, msg, channel.id, msg]
        });
        await interaction.editReply({ embeds: [successEmbed("Message d'arrivée configuré !", `Salon : ${channel}\nMessage : ${msg}`)] });
      } catch (e) {
        console.error(e);
        await interaction.editReply({ embeds: [errorEmbed("Erreur lors de l'enregistrement.")] });
      }

    } else if (sub === "depart") {
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.options.getChannel("salon", true);
      const msg = interaction.options.getString("message") ?? "Au revoir **{user}** ! On espère te revoir sur **{guild}** 👋";
      
      try {
        await db.exec({
          sql: "INSERT INTO guild_settings (guild_id, leave_channel, leave_message) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET leave_channel = ?, leave_message = ?",
          args: [gid, channel.id, msg, channel.id, msg]
        });
        await interaction.editReply({ embeds: [successEmbed("Message de départ configuré !", `Salon : ${channel}\nMessage : ${msg}`)] });
      } catch (e) {
        console.error(e);
        await interaction.editReply({ embeds: [errorEmbed("Erreur lors de l'enregistrement.")] });
      }

    } else if (sub === "test") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const res = await db.exec({
          sql: "SELECT welcome_channel, welcome_message FROM guild_settings WHERE guild_id = ?",
          args: [gid]
        });
        const settings = res.rows[0];
        if (!settings || !settings.welcome_channel) {
          return interaction.editReply({ embeds: [errorEmbed("Aucun salon d'arrivée configuré.")] });
        }
        const ch = interaction.guild?.channels.cache.get(settings.welcome_channel);
        if (!ch) {
          return interaction.editReply({ embeds: [errorEmbed("Salon introuvable.")] });
        }
        
        const buffer = await createWelcomeImage(interaction.member, null, 'welcome');
        const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });

        const rawMsg = settings.welcome_message ?? "Bienvenue {user} sur **{guild}** ! Tu es le **{count}**ème membre ! 🎉";
        const msg = rawMsg
          .replace(/{user}/g, interaction.user.toString())
          .replace(/{guild}/g, interaction.guild?.name ?? "")
          .replace(/{count}/g, `${interaction.guild?.memberCount}`);

        const embed = new EmbedBuilder()
          .setColor(COLORS?.success || 0x10b981)
          .setTitle("Ho ! Un nouveau membre !")
          .setDescription(msg)
          .setImage("attachment://welcome.png")
          .setTimestamp();

        await ch.send({ embeds: [embed], files: [attachment] });
        await interaction.editReply({ embeds: [successEmbed("Message de test envoyé avec succès !")] });
      } catch (e) {
        console.error("Erreur test welcome:", e);
        await interaction.editReply({ embeds: [errorEmbed("Erreur lors de la génération de l'image de test.")] });
      }

    } else if (sub === "disable") {
      await interaction.deferReply({ ephemeral: true });
      await db.exec({
        sql: "UPDATE guild_settings SET welcome_channel = NULL, leave_channel = NULL WHERE guild_id = ?",
        args: [gid]
      });
      await interaction.editReply({ embeds: [successEmbed("Messages de bienvenue désactivés.")] });
    }
  }
};
