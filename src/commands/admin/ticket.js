const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

const { default: db } = require("../../database/db.js");
const { successEmbed, errorEmbed } = require("../../utils/helpers.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Système de tickets")
    .addSubcommand(s =>
      s.setName("addtype")
        .setDescription("Ajouter un type de ticket au menu")
        .addStringOption(o => o.setName("nom").setDescription("Nom affiché dans le menu").setRequired(true))
        .addChannelOption(o => o.setName("categorie").setDescription("Catégorie où créer les salons").addChannelTypes(ChannelType.GuildCategory).setRequired(true))
        .addRoleOption(o => o.setName("role_staff").setDescription("Rôle staff ayant accès").setRequired(true))
        .addStringOption(o => o.setName("emoji").setDescription("Emoji du menu (ex: 🎧)"))
        .addStringOption(o => o.setName("description").setDescription("Description sous le nom dans le menu"))
        .addStringOption(o => o.setName("nom_salon").setDescription("Format du nom de salon (ex: ticket-{count}-{username})"))
        .addStringOption(o => o.setName("message_bienvenue").setDescription("Message envoyé à l'ouverture"))
        .addChannelOption(o => o.setName("salon_logs").setDescription("Salon où logger la fermeture"))
    )
    .addSubcommand(s => s.setName("removetype").setDescription("Retirer un type de ticket").addStringOption(o => o.setName("nom").setRequired(true).setAutocomplete(true)))
    .addSubcommand(s => s.setName("listtypes").setDescription("Lister les types de tickets configurés"))
    .addSubcommand(s => s.setName("panel").setDescription("Envoyer le menu d'ouverture")
        .addChannelOption(o => o.setName("salon").setRequired(true))
        .addStringOption(o => o.setName("titre"))
        .addStringOption(o => o.setName("description")))
    .addSubcommand(s => s.setName("close").setDescription("Fermer le ticket"))
    .addSubcommand(s => s.setName("add").setDescription("Ajouter un membre").addUserOption(o => o.setName("membre").setRequired(true)))
    .addSubcommand(s => s.setName("remove").setDescription("Retirer un membre").addUserOption(o => o.setName("membre").setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const gid = interaction.guildId;
    const res = await db.execute({ sql: "SELECT name FROM ticket_panels WHERE guild_id = ?", args: [gid] });
    const panels = res.rows;
    const filtered = panels.filter(p => p.name.toLowerCase().includes(focused.toLowerCase())).slice(0, 25);
    await interaction.respond(filtered.map(p => ({ name: p.name, value: p.name })));
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId;

    if (sub === "addtype") {
      const nom = interaction.options.getString("nom");
      const categorie = interaction.options.getChannel("categorie");
      const role = interaction.options.getRole("role_staff");
      const emoji = interaction.options.getString("emoji") || "🎫";
      const description = interaction.options.getString("description") || "Ouvrir un ticket";
      const nomSalon = interaction.options.getString("nom_salon") || "ticket-{count}";
      const messageBienvenue = interaction.options.getString("message_bienvenue") || null;
      const salonLogs = interaction.options.getChannel("salon_logs");

      const existing = await db.execute({ sql: "SELECT id FROM ticket_panels WHERE guild_id = ? AND name = ?", args: [gid, nom] });
      if (existing.rows.length > 0) return interaction.reply({ embeds: [errorEmbed("Un type existe déjà avec ce nom.")], ephemeral: true });

      await db.execute({
        sql: `INSERT INTO ticket_panels (guild_id, name, emoji, description, category_open_id, support_role_id, ticket_open_name, welcome_message, log_channel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [gid, nom, emoji, description, categorie.id, role.id, nomSalon, messageBienvenue, salonLogs?.id || null]
      });

      await interaction.reply({ embeds: [successEmbed("✅ Type ajouté", `**Nom :** ${nom}`)], ephemeral: true });

    } else if (sub === "removetype") {
      const nom = interaction.options.getString("nom");
      await db.execute({ sql: "DELETE FROM ticket_panels WHERE guild_id = ? AND name = ?", args: [gid, nom] });
      await interaction.reply({ embeds: [successEmbed("🗑️ Type supprimé", `**${nom}** a été retiré.`)], ephemeral: true });

    } else if (sub === "listtypes") {
      const res = await db.execute({ sql: "SELECT * FROM ticket_panels WHERE guild_id = ?", args: [gid] });
      if (!res.rows.length) return interaction.reply({ embeds: [errorEmbed("Aucun type configuré.")], ephemeral: true });
      
      const desc = res.rows.map(p => `${p.emoji} **${p.name}**\n> ${p.description}`).join("\n\n");
      await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎫 Types configurés').setDescription(desc)], ephemeral: true });

    } else if (sub === "panel") {
      const salon = interaction.options.getChannel("salon");
      const titre = interaction.options.getString("titre") || "Orbis - Bot";
      const description = interaction.options.getString("description") || "Pour créer un ticket, cliquez sur le bouton ci-dessous.";

      const openBtn = new ButtonBuilder().setCustomId("ticket_btn_open").setLabel("Créer un ticket").setEmoji("🎫").setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder().addComponents(openBtn);
      const embed = new EmbedBuilder().setColor('#7c3aed').setTitle(titre).setDescription(description).setFooter({ text: "Propulsé par l'équipe Seeding Studios 🔥" });

      await salon.send({ embeds: [embed], components: [row] });
      await interaction.reply({ embeds: [successEmbed("✅ Panel envoyé")], ephemeral: true });

    } else if (sub === "close") {
      const { closeTicket } = require("../../handlers/ticketHandler.js");
      return closeTicket(interaction);
    } else if (sub === "add") {
      const membre = interaction.options.getMember("membre");
      await interaction.channel.permissionOverwrites.edit(membre, { ViewChannel: true, SendMessages: true });
      await interaction.reply({ embeds: [successEmbed("✅ Membre ajouté")] });
    } else if (sub === "remove") {
      const membre = interaction.options.getMember("membre");
      await interaction.channel.permissionOverwrites.edit(membre, { ViewChannel: false });
      await interaction.reply({ embeds: [successEmbed("✅ Membre retiré")] });
    }
  }
};