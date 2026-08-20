const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require("discord.js");
const { default: db } = require("../database/db.js");

async function handleTicketButton(interaction) {
  const gid = interaction.guildId;
  const panelsRes = await db.execute({
    sql: 'SELECT * FROM ticket_panels WHERE guild_id = ?',
    args: [gid]
  });
  const panels = panelsRes.rows;
  if (!panels.length) return interaction.reply({ content: '❌ Aucun panel configuré.', flags: 64 });

  if (panels.length > 1) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_open_panel')
      .setPlaceholder('Choisir le sujet')
      .addOptions(panels.slice(0, 25).map(p => ({
        label: p.name || p.embed_title || 'Support',
        value: String(p.id),
        emoji: p.emoji || '🎫'
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
  const panelRes = await db.execute({
    sql: 'SELECT * FROM ticket_panels WHERE id = ? AND guild_id = ?',
    args: [panelId, gid]
  });
  const panel = panelRes.rows[0];
  if (!panel) return interaction.reply({ content: '❌ Panel introuvable.', flags: 64 });
  await createTicket(interaction, panel);
}

async function createTicket(interaction, panel) {
  const guild = interaction.guild;
  const gid = guild.id;

  const existingRes = await db.execute({
    sql: "SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open'",
    args: [gid, interaction.user.id]
  });
  const existing = existingRes.rows[0];

  if (existing) {
    const existingChannel = guild.channels.cache.get(existing.channel_id);
    if (!existingChannel) {
      await db.execute({
        sql: "UPDATE tickets SET status = 'closed' WHERE id = ?",
        args: [existing.id]
      });
    } else {
      return interaction.reply({ content: `❌ Tu as déjà un ticket ouvert : <#${existing.channel_id}>`, flags: 64 });
    }
  }

  await interaction.deferReply({ flags: 64 });

  const countRes = await db.execute({
    sql: "SELECT COUNT(*) as c FROM tickets WHERE guild_id = ?",
    args: [gid]
  });
  const count = (countRes.rows[0]?.c ?? 0) + 1;
  
  const nameFormat = panel.ticket_open_name || 'ticket-{count}';
  const channelName = nameFormat
    .replace('{count}', String(count).padStart(panel.ticket_padding || 4, '0'))
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

  await db.execute({
    sql: "INSERT INTO tickets (guild_id, channel_id, user_id, subject, status) VALUES (?, ?, ?, ?, 'open')",
    args: [gid, channel.id, interaction.user.id, panel.name || 'Support']
  });

  const rawDescription = panel.welcome_message || 'Bonjour {user} ! 👋\n\nMerci d\'avoir ouvert un ticket. Le staff va vous répondre dès que possible.\n\nDécrivez votre demande ci-dessous.';
  const description = rawDescription
    .replace(/\{user\}/g, `<@${interaction.user.id}>`)
    .replace(/\{username\}/g, interaction.user.username)
    .replace(/\{server\}/g, guild.name)
    .replace(/\{count\}/g, String(count));

  const embedTitle = panel.embed_title || panel.name || '🎫 Ticket';
  const embedColor = panel.embed_color || '#7c3aed';

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(embedTitle)
    .setDescription(description)
    .setTimestamp();

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
  const ticketRes = await db.execute({
    sql: "SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'",
    args: [interaction.channelId]
  });
  const ticket = ticketRes.rows[0];
  if (!ticket) return interaction.reply({ content: "❌ Ce salon n'est pas un ticket ouvert.", flags: 64 });

  await db.execute({
    sql: "UPDATE tickets SET status = 'closed' WHERE channel_id = ?",
    args: [interaction.channelId]
  });

  // Log si configuré
  const panelRes = await db.execute({
    sql: "SELECT * FROM ticket_panels WHERE guild_id = ?",
    args: [interaction.guildId]
  });
  const panel = panelRes.rows[0];
  
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