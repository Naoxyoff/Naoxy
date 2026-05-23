const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const { db, getGuildSettings } = require("../../database/db.js");
const { successEmbed, errorEmbed, COLORS } = require("../../utils/helpers.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Gérer le système de tickets")
    .addSubcommand(s => s.setName("setup").setDescription("Configurer les tickets").addChannelOption(o => o.setName("categorie").setDescription("Catégorie pour les tickets").setRequired(true)).addRoleOption(o => o.setName("support").setDescription("Rôle support").setRequired(false)))
    .addSubcommand(s => s.setName("panel").setDescription("Créer un panel de tickets").addStringOption(o => o.setName("titre").setDescription("Titre").setRequired(false)).addStringOption(o => o.setName("description").setDescription("Description").setRequired(false)))
    .addSubcommand(s => s.setName("close").setDescription("Fermer le ticket actuel").addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false)))
    .addSubcommand(s => s.setName("add").setDescription("Ajouter un membre au ticket").addUserOption(o => o.setName("membre").setDescription("Membre à ajouter").setRequired(true)))
    .addSubcommand(s => s.setName("remove").setDescription("Retirer un membre du ticket").addUserOption(o => o.setName("membre").setDescription("Membre à retirer").setRequired(true)))
    .addSubcommand(s => s.setName("rename").setDescription("Renommer le ticket").addStringOption(o => o.setName("nom").setDescription("Nouveau nom").setRequired(true)))
    .addSubcommand(s => s.setName("list").setDescription("Lister les tickets ouverts"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId;

    if (sub === "setup") {
      const category = interaction.options.getChannel("categorie", true);
      const support = interaction.options.getRole("support");
      db.prepare("INSERT INTO guild_settings (guild_id, ticket_category, ticket_support_role) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET ticket_category=?, ticket_support_role=?")
        .run(gid, category.id, support?.id ?? null, category.id, support?.id ?? null);
      await interaction.reply({ embeds: [successEmbed("Tickets configurés !", `Catégorie : ${category}${support ? `\nRôle support : ${support}` : ""}`)], ephemeral: true });

    } else if (sub === "panel") {
      const settings = getGuildSettings(gid);
      if (!settings.ticket_category) return interaction.reply({ embeds: [errorEmbed("Configurez d'abord les tickets avec `/ticket setup`")], ephemeral: true });

      const titre = interaction.options.getString("titre") ?? "🎫 Support — Ouvrir un ticket";
      const desc = interaction.options.getString("description") ?? "Cliquez sur le bouton ci-dessous pour ouvrir un ticket avec notre équipe de support.\n\n📌 Décrivez votre problème et un membre du staff vous répondra.";

      const btn = new ButtonBuilder().setCustomId("ticket_open").setLabel("📩 Ouvrir un ticket").setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder().addComponents(btn);

      await interaction.channel.send({
        embeds: [new EmbedBuilder().setColor(COLORS.primary).setTitle(titre).setDescription(desc).setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })],
        components: [row]
      });
      await interaction.reply({ embeds: [successEmbed("Panel créé !")], ephemeral: true });

    } else if (sub === "close") {
      const ticket = db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'").get(interaction.channelId);
      if (!ticket) return interaction.reply({ embeds: [errorEmbed("Ce salon n'est pas un ticket ouvert.")], ephemeral: true });

      const reason = interaction.options.getString("raison") ?? "Aucune raison";

      const closeBtn = new ButtonBuilder().setCustomId("ticket_confirm_close").setLabel("✅ Confirmer la fermeture").setStyle(ButtonStyle.Danger);
      const cancelBtn = new ButtonBuilder().setCustomId("ticket_cancel_close").setLabel("❌ Annuler").setStyle(ButtonStyle.Secondary);
      const row = new ActionRowBuilder().addComponents(closeBtn, cancelBtn);

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle("🔒 Fermeture du ticket").setDescription(`Ce ticket va être fermé.\n**Raison :** ${reason}\n\nConfirmez-vous la fermeture ?`)],
        components: [row]
      });

    } else if (sub === "add") {
      const ticket = db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'").get(interaction.channelId);
      if (!ticket) return interaction.reply({ embeds: [errorEmbed("Ce salon n'est pas un ticket.")], ephemeral: true });
      const membre = interaction.options.getMember("membre");
      await interaction.channel.permissionOverwrites.edit(membre, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      await interaction.reply({ embeds: [successEmbed("Membre ajouté", `${membre} a été ajouté au ticket.`)] });

    } else if (sub === "remove") {
      const ticket = db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'").get(interaction.channelId);
      if (!ticket) return interaction.reply({ embeds: [errorEmbed("Ce salon n'est pas un ticket.")], ephemeral: true });
      const membre = interaction.options.getMember("membre");
      await interaction.channel.permissionOverwrites.edit(membre, { ViewChannel: false });
      await interaction.reply({ embeds: [successEmbed("Membre retiré", `${membre} a été retiré du ticket.`)] });

    } else if (sub === "rename") {
      const ticket = db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'").get(interaction.channelId);
      if (!ticket) return interaction.reply({ embeds: [errorEmbed("Ce salon n'est pas un ticket.")], ephemeral: true });
      const nom = interaction.options.getString("nom", true);
      await interaction.channel.setName(`ticket-${nom}`);
      await interaction.reply({ embeds: [successEmbed("Ticket renommé", `Le ticket s'appelle maintenant \`ticket-${nom}\`.`)] });

    } else if (sub === "list") {
      const tickets = db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 20").all(gid);
      if (tickets.length === 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle("🎫 Tickets ouverts").setDescription("Aucun ticket ouvert.")] });
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.primary).setTitle(`🎫 Tickets ouverts (${tickets.length})`).setDescription(tickets.map(t => `<#${t.channel_id}> — <@${t.user_id}> — <t:${t.created_at}:R>`).join("\n"))]
      });
    }
  }
};
