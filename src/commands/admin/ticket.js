const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
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
        .addStringOption(o => o.setName("emoji").setDescription("Emoji du menu (ex: 🎧)").setRequired(false))
        .addStringOption(o => o.setName("description").setDescription("Description sous le nom dans le menu").setRequired(false))
        .addStringOption(o => o.setName("nom_salon").setDescription("Format du nom de salon, ex: ticket-{count}-{username}").setRequired(false))
        .addStringOption(o => o.setName("message_bienvenue").setDescription("Message envoyé à l'ouverture du ticket").setRequired(false))
        .addChannelOption(o => o.setName("salon_logs").setDescription("Salon où logger la fermeture des tickets").setRequired(false))
    )

    .addSubcommand(s =>
      s.setName("removetype")
        .setDescription("Retirer un type de ticket")
        .addStringOption(o => o.setName("nom").setDescription("Nom exact du type à retirer").setRequired(true).setAutocomplete(true))
    )

    .addSubcommand(s =>
      s.setName("listtypes")
        .setDescription("Lister les types de tickets configurés")
    )

    .addSubcommand(s =>
      s.setName("panel")
        .setDescription("Envoyer le menu d'ouverture de ticket dans un salon")
        .addChannelOption(o => o.setName("salon").setDescription("Salon où envoyer le menu").setRequired(true))
        .addStringOption(o => o.setName("titre").setDescription("Titre de l'embed").setRequired(false))
        .addStringOption(o => o.setName("description").setDescription("Description de l'embed").setRequired(false))
    )

    .addSubcommand(s =>
      s.setName("close")
        .setDescription("Fermer le ticket")
    )

    .addSubcommand(s =>
      s.setName("add")
        .setDescription("Ajouter un membre au ticket")
        .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    )

    .addSubcommand(s =>
      s.setName("remove")
        .setDescription("Retirer un membre du ticket")
        .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
    )

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
      if (existing.rows.length > 0) {
        return interaction.reply({ embeds: [errorEmbed("Un type de ticket avec ce nom existe déjà.")], ephemeral: true });
      }

      await db.execute({
        sql: `INSERT INTO ticket_panels (guild_id, name, emoji, description, category_open_id, support_role_id, ticket_open_name, welcome_message, log_channel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [gid, nom, emoji, description, categorie.id, role.id, nomSalon, messageBienvenue, salonLogs ? salonLogs.id : null]
      });

      await interaction.reply({
        embeds: [successEmbed("✅ Type de ticket ajouté",
          `**Nom :** ${nom}\n**Emoji :** ${emoji}\n**Catégorie :** ${categorie}\n**Rôle staff :** ${role}\n**Format nom salon :** \`${nomSalon}\`${salonLogs ? `\n**Logs :** ${salonLogs}` : ''}\n\nUtilise \`/ticket panel\` pour afficher le menu.`
        )],
        ephemeral: true
      });

    } else if (sub === "removetype") {
      const nom = interaction.options.getString("nom");
      const existing = await db.execute({ sql: "SELECT id FROM ticket_panels WHERE guild_id = ? AND name = ?", args: [gid, nom] });
      if (existing.rows.length === 0) {
        return interaction.reply({ embeds: [errorEmbed("Aucun type de ticket avec ce nom.")], ephemeral: true });
      }
      await db.execute({ sql: "DELETE FROM ticket_panels WHERE id = ?", args: [existing.rows[0].id] });
      await interaction.reply({ embeds: [successEmbed("🗑️ Type de ticket supprimé", `**${nom}** a été retiré.`)], ephemeral: true });

    } else if (sub === "listtypes") {
      const res = await db.execute({ sql: "SELECT * FROM ticket_panels WHERE guild_id = ?", args: [gid] });
      if (!res.rows.length) {
        return interaction.reply({ embeds: [errorEmbed("Aucun type de ticket configuré.", "Utilise `/ticket addtype` pour en créer un.")], ephemeral: true });
      }
      const desc = res.rows.map(p => {
        const cat = interaction.guild.channels.cache.get(p.category_open_id);
        const role = interaction.guild.roles.cache.get(p.support_role_id);
        return `${p.emoji} **${p.name}**\n> ${p.description}\n> Catégorie : ${cat ? cat.name : '❌ introuvable'} • Staff : ${role ? role.name : '❌ introuvable'}`;
      }).join("\n\n");
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor('#7c3aed').setTitle('🎫 Types de tickets configurés').setDescription(desc)],
        ephemeral: true
      });

    } else if (sub === "panel") {
      const salon = interaction.options.getChannel("salon");
      const titre = interaction.options.getString("titre") || "Orbis - Bot";
      const description = interaction.options.getString("description") || "Pour créer un ticket, cliquez sur le bouton ci-dessous.";

      const res = await db.execute({ sql: "SELECT * FROM ticket_panels WHERE guild_id = ?", args: [gid] });
      if (!res.rows.length) {
        return interaction.reply({ embeds: [errorEmbed("Aucun type de ticket configuré.", "Utilise `/ticket addtype` avant de créer le panel.")], ephemeral: true });
      }

      const openBtn = new ButtonBuilder()
        .setCustomId("ticket_btn_open")
        .setLabel("Créer un ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(openBtn);

      const embed = new EmbedBuilder()
        .setColor('#7c3aed')
        .setTitle(titre)
        .setDescription(description)
        .setFooter({ text: "Propulsé par l'équipe Seeding Studios 🔥" });

      await salon.send({ embeds: [embed], components: [row] });

      await interaction.reply({
        embeds: [successEmbed("✅ Panel envoyé", `Le bouton de ticket a été envoyé dans ${salon}.`)],
        ephemeral: true
      });

    } else if (sub === "close") {
      const { closeTicket } = require("../../handlers/ticketHandler.js");
      return closeTicket(interaction);

    } else if (sub === "add") {
      const membre = interaction.options.getMember("membre");
      await interaction.channel.permissionOverwrites.edit(membre, { ViewChannel: true, SendMessages: true });
      await interaction.reply({ embeds: [successEmbed("✅ Membre ajouté", `${membre} a accès au ticket.`)] });

    } else if (sub === "remove") {
      const membre = interaction.options.getMember("membre");
      await interaction.channel.permissionOverwrites.edit(membre, { ViewChannel: false });
      await interaction.reply({ embeds: [successEmbed("✅ Membre retiré", `${membre} n'a plus accès au ticket.`)] });
    }
  }
};