const {
  SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder, StringSelectMenuBuilder,
  ChannelType
} = require("discord.js");
const { default: db } = require("../../database/db.js");
const { successEmbed, errorEmbed, infoEmbed, COLORS } = require("../../utils/helpers.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Système de gestion des rôles")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommandGroup(g => g.setName("autorole").setDescription("Rôle automatique à l'arrivée")
      .addSubcommand(s => s.setName("add").setDescription("Ajouter un rôle automatique")
        .addRoleOption(o => o.setName("role").setDescription("Rôle à donner").setRequired(true))
        .addStringOption(o => o.setName("type").setDescription("Type de membre").setRequired(false)
          .addChoices({ name: "Tous", value: "all" }, { name: "Humains seulement", value: "human" }, { name: "Bots seulement", value: "bot" })))
      .addSubcommand(s => s.setName("remove").setDescription("Retirer un rôle automatique")
        .addRoleOption(o => o.setName("role").setDescription("Rôle à retirer").setRequired(true)))
      .addSubcommand(s => s.setName("list").setDescription("Lister les rôles automatiques")))
    .addSubcommandGroup(g => g.setName("reactionrole").setDescription("Rôle via réaction/bouton")
      .addSubcommand(s => s.setName("create").setDescription("Créer un message avec des rôles à cliquer")
        .addChannelOption(o => o.setName("salon").setDescription("Salon cible").setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addStringOption(o => o.setName("titre").setDescription("Titre du message").setRequired(true))
        .addStringOption(o => o.setName("description").setDescription("Description du message").setRequired(false))
        .addStringOption(o => o.setName("mode").setDescription("Mode").setRequired(false)
          .addChoices({ name: "Boutons", value: "button" }, { name: "Menu déroulant", value: "select" })))
      .addSubcommand(s => s.setName("add").setDescription("Ajouter un rôle à un message existant")
        .addStringOption(o => o.setName("message_id").setDescription("ID du message").setRequired(true))
        .addRoleOption(o => o.setName("role").setDescription("Rôle").setRequired(true))
        .addStringOption(o => o.setName("label").setDescription("Texte du bouton").setRequired(false))
        .addStringOption(o => o.setName("emoji").setDescription("Emoji").setRequired(false)))
      .addSubcommand(s => s.setName("remove").setDescription("Retirer un rôle d'un message")
        .addStringOption(o => o.setName("message_id").setDescription("ID du message").setRequired(true))
        .addRoleOption(o => o.setName("role").setDescription("Rôle").setRequired(true)))
      .addSubcommand(s => s.setName("delete").setDescription("Supprimer tout un message de rôles")
        .addStringOption(o => o.setName("message_id").setDescription("ID du message").setRequired(true))))
    .addSubcommandGroup(g => g.setName("mute").setDescription("Rôle muet")
      .addSubcommand(s => s.setName("set").setDescription("Définir le rôle muet")
        .addRoleOption(o => o.setName("role").setDescription("Rôle muet").setRequired(true)))
      .addSubcommand(s => s.setName("give").setDescription("Donner le rôle muet à un membre")
        .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
        .addStringOption(o => o.setName("raison").setDescription("Raison").setRequired(false))
        .addIntegerOption(o => o.setName("duree").setDescription("Durée en minutes (0 = permanent)").setRequired(false)))
      .addSubcommand(s => s.setName("remove").setDescription("Retirer le rôle muet")
        .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))))
    .addSubcommand(s => s.setName("give").setDescription("Donner un rôle à un membre")
      .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
      .addRoleOption(o => o.setName("role").setDescription("Rôle").setRequired(true)))
    .addSubcommand(s => s.setName("take").setDescription("Retirer un rôle à un membre")
      .addUserOption(o => o.setName("membre").setDescription("Membre").setRequired(true))
      .addRoleOption(o => o.setName("role").setDescription("Rôle").setRequired(true)))
    .addSubcommand(s => s.setName("all").setDescription("Donner/retirer un rôle à tout le monde")
      .addRoleOption(o => o.setName("role").setDescription("Rôle").setRequired(true))
      .addStringOption(o => o.setName("action").setDescription("Action").setRequired(true)
        .addChoices({ name: "Donner", value: "give" }, { name: "Retirer", value: "take" }))),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (group === "autorole") {
      if (sub === "add") {
        const role = interaction.options.getRole("role");
        const type = interaction.options.getString("type") || "all";
        if (role.managed) return interaction.reply({ embeds: [errorEmbed("Ce rôle est géré par une intégration.")], ephemeral: true });
        await db.execute({ sql: "INSERT OR REPLACE INTO autoroles (guild_id, role_id, type) VALUES (?, ?, ?)", args: [guild.id, role.id, type] });
        return interaction.reply({ embeds: [successEmbed("✅ Autorole ajouté !", `${role} sera donné automatiquement aux **${type === "all" ? "tous" : type === "human" ? "humains" : "bots"}**.`)], ephemeral: true });
      }
      if (sub === "remove") {
        const role = interaction.options.getRole("role");
        await db.execute({ sql: "DELETE FROM autoroles WHERE guild_id = ? AND role_id = ?", args: [guild.id, role.id] });
        return interaction.reply({ embeds: [successEmbed("✅ Autorole retiré !", `${role} ne sera plus donné automatiquement.`)], ephemeral: true });
      }
      if (sub === "list") {
        const rowsRes = await db.execute({ sql: "SELECT * FROM autoroles WHERE guild_id = ?", args: [guild.id] });
        const rows = rowsRes.rows;
        if (!rows.length) return interaction.reply({ embeds: [infoEmbed("Aucun autorole configuré.")], ephemeral: true });
        const desc = rows.map(r => `<@&${r.role_id}> — \`${r.type}\``).join("\n");
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle("🎭 Autoroles").setDescription(desc)], ephemeral: true });
      }
    }

    if (group === "reactionrole") {
      if (sub === "create") {
        const salon = interaction.options.getChannel("salon");
        const titre = interaction.options.getString("titre");
        const description = (interaction.options.getString("description") || "Clique sur un bouton pour obtenir ou retirer un rôle.").replace(/\\n/g, "\n");
        const mode = interaction.options.getString("mode") || "button";

        const embed = new EmbedBuilder().setColor(0x4e2bd9).setTitle(titre).setDescription(description);
        const msg = await salon.send({ embeds: [embed] });

        await db.execute({ sql: "INSERT INTO reactionroles (guild_id, message_id, channel_id, mode) VALUES (?, ?, ?, ?)", args: [guild.id, msg.id, salon.id, mode] });
        return interaction.reply({ embeds: [successEmbed("✅ Message créé !", `Message de rôles créé dans ${salon}.\nID : \`${msg.id}\`\nUtilise \`/roles reactionrole add\` pour ajouter des rôles.`)], ephemeral: true });
      }

      if (sub === "add") {
        const messageId = interaction.options.getString("message_id");
        const role = interaction.options.getRole("role");
        const label = interaction.options.getString("label") || role.name;
        const emoji = interaction.options.getString("emoji") || null;

        const rrRowRes = await db.execute({ sql: "SELECT * FROM reactionroles WHERE guild_id = ? AND message_id = ?", args: [guild.id, messageId] });
        const rrRow = rrRowRes.rows[0];
        if (!rrRow) return interaction.reply({ embeds: [errorEmbed("Message de rôles introuvable.")], ephemeral: true });

        await db.execute({ sql: "INSERT OR REPLACE INTO reactionrole_items (message_id, role_id, label, emoji) VALUES (?, ?, ?, ?)", args: [messageId, role.id, label, emoji] });

        await refreshReactionRoleMessage(guild, rrRow);
        return interaction.reply({ embeds: [successEmbed("✅ Rôle ajouté !", `${role} ajouté au message de rôles.`)], ephemeral: true });
      }

      if (sub === "remove") {
        const messageId = interaction.options.getString("message_id");
        const role = interaction.options.getRole("role");
        const rrRowRes = await db.execute({ sql: "SELECT * FROM reactionroles WHERE guild_id = ? AND message_id = ?", args: [guild.id, messageId] });
        const rrRow = rrRowRes.rows[0];
        if (!rrRow) return interaction.reply({ embeds: [errorEmbed("Message introuvable.")], ephemeral: true });
        await db.execute({ sql: "DELETE FROM reactionrole_items WHERE message_id = ? AND role_id = ?", args: [messageId, role.id] });
        await refreshReactionRoleMessage(guild, rrRow);
        return interaction.reply({ embeds: [successEmbed("✅ Rôle retiré du message.")], ephemeral: true });
      }

      if (sub === "delete") {
        const messageId = interaction.options.getString("message_id");
        const rrRowRes = await db.execute({ sql: "SELECT * FROM reactionroles WHERE guild_id = ? AND message_id = ?", args: [guild.id, messageId] });
        const rrRow = rrRowRes.rows[0];
        if (!rrRow) return interaction.reply({ embeds: [errorEmbed("Message introuvable.")], ephemeral: true });
        try {
          const channel = await guild.channels.fetch(rrRow.channel_id);
          const msg = await channel.messages.fetch(messageId);
          await msg.delete();
        } catch {}
        await db.execute({ sql: "DELETE FROM reactionrole_items WHERE message_id = ?", args: [messageId] });
        await db.execute({ sql: "DELETE FROM reactionroles WHERE message_id = ?", args: [messageId] });
        return interaction.reply({ embeds: [successEmbed("✅ Message de rôles supprimé.")], ephemeral: true });
      }
    }

    if (group === "mute") {
      if (sub === "set") {
        const role = interaction.options.getRole("role");
        await db.execute({ sql: "INSERT OR REPLACE INTO guild_settings (guild_id, mute_role) VALUES (?, ?)", args: [guild.id, role.id] });
        return interaction.reply({ embeds: [successEmbed("✅ Rôle muet défini !", `${role} sera utilisé pour les mutes.`)], ephemeral: true });
      }
      if (sub === "give") {
        const member = await guild.members.fetch(interaction.options.getUser("membre").id);
        const raison = interaction.options.getString("raison") || "Aucune raison";
        const duree = interaction.options.getInteger("duree") || 0;
        const rowRes = await db.execute({ sql: "SELECT mute_role FROM guild_settings WHERE guild_id = ?", args: [guild.id] });
        const row = rowRes.rows[0];
        if (!row || !row.mute_role) return interaction.reply({ embeds: [errorEmbed("Aucun rôle muet configuré. Utilise `/roles mute set`.")], ephemeral: true });
        await member.roles.add(row.mute_role, raison);
        if (duree > 0) {
          setTimeout(async () => {
            try { await member.roles.remove(row.mute_role, "Fin de mute automatique"); } catch {}
          }, duree * 60 * 1000);
        }
        return interaction.reply({ embeds: [successEmbed("🔇 Membre muté !", `${member} a été muté.\nRaison : ${raison}\nDurée : ${duree > 0 ? `${duree} minutes` : "Permanent"}`)] });
      }
      if (sub === "remove") {
        const member = await guild.members.fetch(interaction.options.getUser("membre").id);
        const rowRes = await db.execute({ sql: "SELECT mute_role FROM guild_settings WHERE guild_id = ?", args: [guild.id] });
        const row = rowRes.rows[0];
        if (!row || !row.mute_role) return interaction.reply({ embeds: [errorEmbed("Aucun rôle muet configuré.")], ephemeral: true });
        await member.roles.remove(row.mute_role, "Unmute");
        return interaction.reply({ embeds: [successEmbed("🔊 Membre démute !", `${member} n'est plus muté.`)] });
      }
    }

    if (sub === "give") {
      const member = await guild.members.fetch(interaction.options.getUser("membre").id);
      const role = interaction.options.getRole("role");
      if (role.managed) return interaction.reply({ embeds: [errorEmbed("Rôle géré par une intégration.")], ephemeral: true });
      await member.roles.add(role);
      return interaction.reply({ embeds: [successEmbed("✅ Rôle donné !", `${role} donné à ${member}.`)] });
    }
    if (sub === "take") {
      const member = await guild.members.fetch(interaction.options.getUser("membre").id);
      const role = interaction.options.getRole("role");
      await member.roles.remove(role);
      return interaction.reply({ embeds: [successEmbed("✅ Rôle retiré !", `${role} retiré de ${member}.`)] });
    }
    if (sub === "all") {
      await interaction.deferReply();
      const role = interaction.options.getRole("role");
      const action = interaction.options.getString("action");
      const members = await guild.members.fetch({ force: true });
      let count = 0;
      for (const [, member] of members) {
        if (member.user.bot) continue;
        try {
          if (action === "give") await member.roles.add(role);
          else await member.roles.remove(role);
          count++;
          await new Promise(r => setTimeout(r, 500));
        } catch (e) { console.error('Erreur membre:', member.user.tag, e.message); }
      }
      return interaction.editReply({ embeds: [successEmbed(`✅ Rôle ${action === "give" ? "donné" : "retiré"} !`, `${role} ${action === "give" ? "donné à" : "retiré de"} **${count}** membres.`)] });
    }
  }
};

async function refreshReactionRoleMessage(guild, rrRow) {
  try {
    const channel = await guild.channels.fetch(rrRow.channel_id);
    const msg = await channel.messages.fetch(rrRow.message_id);
    const itemsRes = await db.execute({ sql: "SELECT * FROM reactionrole_items WHERE message_id = ?", args: [rrRow.message_id] });
    const items = itemsRes.rows;
    if (!items.length) { await msg.edit({ components: [] }); return; }

    if (rrRow.mode === "select") {
      const options = items.map(i => ({ label: i.label, value: i.role_id, emoji: i.emoji || undefined }));
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(`rr_select_${rrRow.message_id}`).setPlaceholder("Choisis un rôle...").addOptions(options)
      );
      await msg.edit({ components: [row] });
    } else {
      const rows = [];
      for (let i = 0; i < items.length; i += 5) {
        const chunk = items.slice(i, i + 5);
        const actionRow = new ActionRowBuilder().addComponents(
          chunk.map(item => {
            const btn = new ButtonBuilder().setCustomId(`rr_btn_${item.role_id}`).setLabel(item.label).setStyle(ButtonStyle.Primary);
            if (item.emoji) btn.setEmoji(item.emoji);
            return btn;
          })
        );
        rows.push(actionRow);
      }
      await msg.edit({ components: rows });
    }
  } catch (e) { console.error("[RR] Erreur refresh:", e.message); }
}