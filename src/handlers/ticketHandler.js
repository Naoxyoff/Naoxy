const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require("discord.js");
const { db } = require("../database/db.js");

async function handleTicketButton(interaction) {
  const gid = interaction.guildId;
  const panels = db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ?').all(gid);
  if (!panels.length) return interaction.reply({ content: '❌ Aucun panel configuré.', flags: 64 });

  if (panels.length > 1) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_open_panel')
      .setPlaceholder('Choisir le sujet')
      .addOptions(panels.slice(0, 25).map(p => ({
        label: p.name || p.embed_title || 'Support',
        value: String(p.id),
        emoji: '🎫'
      })));

    const cancelBtn = new ButtonBuilder()
      .setCustomId('ticket_cancel')
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Danger);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#7c3aed')
        .setTitle('Ouvrir un ticket')
        .setDescription('Bonjour, votre demande a bien été prise en compte, pour procéder à la suite veuillez choisir le sujet de votre demande:')],
      components: [
        new ActionRowBuilder().addComponents(menu),
        new ActionRowBuilder().addComponents(cancelBtn)
      ],
      flags: 64
    });
  }

  await createTicket(interaction, panels[0]);
}

async function handleTicketSelect(interaction) {
  const gid = interaction.guildId;
  const panelId = interaction.values[0];
  const panel = db.prepare('SELECT * FROM ticket_panels WHERE id = ? AND guild_id = ?').get(panelId, gid);
  if (!panel) return interaction.reply({ content: '❌ Panel introuvable.', flags: 64 });
  await createTicket(interaction, panel);
}

async function createTicket(interaction, panel) {
  const guild = interaction.guild;
  const gid = guild.id;

  const existing = db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open'").get(gid, interaction.user.id);
  if (existing) return interaction.reply({ content: `❌ Tu as déjà un ticket ouvert : <#${existing.channel_id}>`, flags: 64 });

  await interaction.deferReply({ flags: 64 });

  const count = (db.prepare("SELECT COUNT(*) as c FROM tickets WHERE guild_id = ?").get(gid)?.c ?? 0) + 1;
  
  const nameFormat = panel.ticket_open_name || 'ticket-{count}-{username}';
  const channelName = nameFormat
    .replace('{count}', String(count).padStart(panel.ticket_padding || 4, '0'))
    .replace('{username}', interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .replace('{user}', interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .toLowerCase()
    .slice(0, 100);

  const categoryId = panel.category_open_id;
  const supportRoleId = panel.support_role_id;
  const staffRole = supportRoleId ? guild.roles.cache.get(supportRoleId) : null;
  const category = categoryId ? guild.channels.cache.get(categoryId) : null;

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category ?? null,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...(staffRole ? [{ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] }] : []),
    ],
    reason: `Ticket ouvert par ${interaction.user.tag}`,
  });

  db.prepare("INSERT INTO tickets (guild_id, channel_id, user_id, subject, status) VALUES (?, ?, ?, ?, 'open')").run(gid, channel.id, interaction.user.id, panel.name || 'Support');

  // Lire le message depuis ticket_messages, sinon fallback sur welcome_message du panel
  const ticketMsg = db.prepare("SELECT * FROM ticket_messages WHERE panel_id = ? AND guild_id = ? AND type = 'open'").get(panel.id, gid);
  
  const rawDescription = ticketMsg?.embed_description || panel.welcome_message || 'Bonjour {user} ! 👋\n\nMerci d\'avoir ouvert un ticket. Le staff va vous répondre dès que possible.\n\nDécrivez votre demande ci-dessous.';
  const description = rawDescription
    .replace(/\{user\}/g, `<@${interaction.user.id}>`)
    .replace(/\{username\}/g, interaction.user.username)
    .replace(/\{server\}/g, guild.name)
    .replace(/\{count\}/g, String(count));

  const embedTitle = ticketMsg?.embed_title || panel.embed_title || panel.name || '🎫 Ticket';
  const embedColor = ticketMsg?.embed_color || panel.embed_color || '#7c3aed';

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(embedTitle)
    .setDescription(description)
    .setTimestamp();

  if (ticketMsg?.embed_footer) embed.setFooter({ text: ticketMsg.embed_footer.replace(/\{user\}/g, interaction.user.username) });
  if (ticketMsg?.embed_author) embed.setAuthor({ name: ticketMsg.embed_author.replace(/\{user\}/g, interaction.user.username) });

  const closeBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket_close_btn").setLabel("🔒 Fermer le ticket").setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: staffRole ? `<@&${staffRole.id}>` : `<@${interaction.user.id}>`,
    embeds: [embed],
    components: [closeBtn]
  });

  await interaction.editReply({ content: `✅ Ton ticket a été créé : ${channel}` });
}

async function closeTicket(interaction) {
  const ticket = db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'").get(interaction.channelId);
  if (!ticket) return interaction.reply({ content: "❌ Ce salon n'est pas un ticket ouvert.", flags: 64 });

  db.prepare("UPDATE tickets SET status = 'closed' WHERE channel_id = ?").run(interaction.channelId);

  // Log si configuré
  const panel = db.prepare("SELECT * FROM ticket_panels WHERE guild_id = ?").get(interaction.guildId);
  if (panel?.log_channel_id) {
    const logCh = interaction.guild.channels.cache.get(panel.log_channel_id);
    if (logCh) {
      await logCh.send({ embeds: [new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('🔒 Ticket fermé')
        .addFields(
          { name: 'Salon', value: interaction.channel.name, inline: true },
          { name: 'Fermé par', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Ouvert par', value: `<@${ticket.user_id}>`, inline: true }
        )
        .setTimestamp()]
      });
    }
  }

  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(0xFF4444).setDescription('🔒 Ticket fermé. Suppression dans 5 secondes...')]
  });

  setTimeout(() => interaction.channel.delete('Ticket fermé').catch(() => {}), 5000);
}

module.exports = { handleTicketButton, handleTicketSelect, closeTicket };
