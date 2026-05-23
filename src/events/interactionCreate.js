const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { db, getGuildSettings } = require("../database/db.js");
const { COLORS, successEmbed, errorEmbed } = require("../utils/helpers.js");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isButton()) {
      const gid = interaction.guildId;
      const settings = getGuildSettings(gid);

      // ── Ouvrir un ticket ──
      if (interaction.customId === "ticket_open") {
        const existing = db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open'").get(gid, interaction.user.id);
        if (existing) {
          return interaction.reply({ embeds: [errorEmbed("Ticket déjà ouvert", `Tu as déjà un ticket ouvert : <#${existing.channel_id}>`)], ephemeral: true });
        }

        if (!settings.ticket_category) {
          return interaction.reply({ embeds: [errorEmbed("Tickets non configurés", "Un admin doit faire `/ticket setup` d'abord.")], ephemeral: true });
        }

        const category = interaction.guild.channels.cache.get(settings.ticket_category);
        if (!category) return interaction.reply({ embeds: [errorEmbed("Catégorie introuvable.")], ephemeral: true });

        const ticketCount = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ?").get(gid);
        const channelName = `ticket-${interaction.user.username}-${ticketCount.count + 1}`;

        const permissionOverwrites = [
          { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ];

        if (settings.ticket_support_role) {
          permissionOverwrites.push({ id: settings.ticket_support_role, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] });
        }

        const channel = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites,
        });

        db.prepare("INSERT INTO tickets (guild_id, channel_id, user_id, status) VALUES (?, ?, ?, 'open')").run(gid, channel.id, interaction.user.id);

        const closeBtn = new ButtonBuilder().setCustomId("ticket_close_btn").setLabel("🔒 Fermer le ticket").setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(closeBtn);

        await channel.send({
          content: `${interaction.user} ${settings.ticket_support_role ? `<@&${settings.ticket_support_role}>` : ""}`,
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.primary)
              .setTitle("🎫 Nouveau ticket")
              .setDescription(`Bonjour ${interaction.user} ! 👋\nDécrivez votre problème et un membre du staff vous répondra dès que possible.`)
              .addFields({ name: "Créé par", value: `${interaction.user} (\`${interaction.user.id}\`)` })
              .setTimestamp()
          ],
          components: [row]
        });

        await interaction.reply({ embeds: [successEmbed("Ticket ouvert !", `Ton ticket a été créé : ${channel}`)], ephemeral: true });
      }

      // ── Fermer via bouton ──
      if (interaction.customId === "ticket_close_btn") {
        const ticket = db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'").get(interaction.channelId);
        if (!ticket) return interaction.reply({ embeds: [errorEmbed("Ce salon n'est pas un ticket ouvert.")], ephemeral: true });

        const closeBtn = new ButtonBuilder().setCustomId("ticket_confirm_close").setLabel("✅ Confirmer").setStyle(ButtonStyle.Danger);
        const cancelBtn = new ButtonBuilder().setCustomId("ticket_cancel_close").setLabel("❌ Annuler").setStyle(ButtonStyle.Secondary);
        const row = new ActionRowBuilder().addComponents(closeBtn, cancelBtn);

        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle("🔒 Fermer le ticket ?").setDescription("Confirmez-vous la fermeture de ce ticket ?")],
          components: [row]
        });
      }

      // ── Confirmer fermeture ──
      if (interaction.customId === "ticket_confirm_close") {
        const ticket = db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'").get(interaction.channelId);
        if (!ticket) return;

        db.prepare("UPDATE tickets SET status = 'closed' WHERE channel_id = ?").run(interaction.channelId);

        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle("🔒 Ticket fermé").setDescription(`Fermé par ${interaction.user}.\nSuppression dans 5 secondes...`)]
        });

        setTimeout(async () => {
          await interaction.channel.delete().catch(() => {});
        }, 5000);
      }

      // ── Annuler fermeture ──
      if (interaction.customId === "ticket_cancel_close") {
        await interaction.reply({ embeds: [successEmbed("Fermeture annulée")], ephemeral: true });
      }
    }
  }
};
