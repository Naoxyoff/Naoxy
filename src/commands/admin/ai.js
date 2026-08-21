const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../../database/db.js").default || require("../../database/db.js");
const { successEmbed, errorEmbed, COLORS } = require("../../utils/helpers.js");

async function upsertSettings(gid, updates) {
  const existingRes = await db.execute({ sql: "SELECT guild_id FROM guild_settings WHERE guild_id = ?", args: [gid] });
  if (existingRes.rows.length > 0) {
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    await db.execute({ sql: `UPDATE guild_settings SET ${setClauses} WHERE guild_id = ?`, args: [...Object.values(updates), gid] });
  } else {
    const withGid = { guild_id: gid, ...updates };
    const keys = Object.keys(withGid).join(", ");
    const placeholders = Object.keys(withGid).map(() => "?").join(", ");
    await db.execute({ sql: `INSERT INTO guild_settings (${keys}) VALUES (${placeholders})`, args: Object.values(withGid) });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Configurer l'assistant IA du bot")
    .addSubcommand(s => s.setName("enable").setDescription("Activer l'IA sur ce serveur"))
    .addSubcommand(s => s.setName("disable").setDescription("Désactiver l'IA sur ce serveur"))
    .addSubcommand(s => s.setName("channel").setDescription("Restreindre l'IA à un salon (laisser vide = tous les salons)")
      .addChannelOption(o => o.setName("salon").setDescription("Salon autorisé").setRequired(false)))
    .addSubcommand(s => s.setName("persona").setDescription("Définir le nom/persona de l'IA")
      .addStringOption(o => o.setName("nom").setDescription("Nom de la persona").setRequired(true)))
    .addSubcommand(s => s.setName("model").setDescription("Définir le modèle Groq utilisé")
      .addStringOption(o => o.setName("modele").setDescription("ID du modèle (ex: llama-3.3-70b-versatile)").setRequired(true)))
    .addSubcommand(s => s.setName("maxtokens").setDescription("Définir la longueur max des réponses")
      .addIntegerOption(o => o.setName("valeur").setDescription("Nombre de tokens max").setMinValue(50).setMaxValue(4000).setRequired(true)))
    .addSubcommand(s => s.setName("status").setDescription("Voir la configuration IA actuelle"))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId;

    if (sub === "enable") {
      await upsertSettings(gid, { ai_enabled: 1 });
      return interaction.reply({ embeds: [successEmbed("✅ IA activée !", "L'assistant IA répondra maintenant aux mentions sur ce serveur.")], ephemeral: true });
    }

    if (sub === "disable") {
      await upsertSettings(gid, { ai_enabled: 0 });
      return interaction.reply({ embeds: [successEmbed("✅ IA désactivée.")], ephemeral: true });
    }

    if (sub === "channel") {
      const salon = interaction.options.getChannel("salon");
      await upsertSettings(gid, { ai_channel: salon ? salon.id : null });
      return interaction.reply({ embeds: [successEmbed("✅ Salon IA mis à jour !", salon ? `L'IA ne répondra que dans ${salon}.` : "L'IA répondra dans tous les salons.")], ephemeral: true });
    }

    if (sub === "persona") {
      const nom = interaction.options.getString("nom", true);
      await upsertSettings(gid, { ai_persona: nom });
      return interaction.reply({ embeds: [successEmbed("✅ Persona mise à jour !", `L'IA s'appellera désormais **${nom}**.`)], ephemeral: true });
    }

    if (sub === "model") {
      const modele = interaction.options.getString("modele", true);
      await upsertSettings(gid, { ai_model: modele });
      return interaction.reply({ embeds: [successEmbed("✅ Modèle mis à jour !", `Modèle utilisé : \`${modele}\``)], ephemeral: true });
    }

    if (sub === "maxtokens") {
      const valeur = interaction.options.getInteger("valeur", true);
      await upsertSettings(gid, { ai_max_tokens: valeur });
      return interaction.reply({ embeds: [successEmbed("✅ Longueur max mise à jour !", `Max tokens : **${valeur}**`)], ephemeral: true });
    }

    if (sub === "status") {
      const res = await db.execute({ sql: "SELECT ai_enabled, ai_channel, ai_model, ai_max_tokens, ai_persona FROM guild_settings WHERE guild_id = ?", args: [gid] });
      const row = res.rows[0] || {};
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle("🤖 Configuration de l'IA")
        .addFields(
          { name: "Statut", value: row.ai_enabled ? "✅ Activée" : "❌ Désactivée", inline: true },
          { name: "Persona", value: row.ai_persona || "Orbis", inline: true },
          { name: "Modèle", value: `\`${row.ai_model || "llama-3.3-70b-versatile"}\``, inline: true },
          { name: "Max tokens", value: `${row.ai_max_tokens ?? 500}`, inline: true },
          { name: "Salon restreint", value: row.ai_channel ? `<#${row.ai_channel}>` : "Tous les salons", inline: true },
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
