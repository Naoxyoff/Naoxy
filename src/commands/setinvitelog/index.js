const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../../data/inviteLogConfig.json");

function loadConfig() {
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

function saveConfig(config) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setinvitelog")
    .setDescription("Définir le salon pour les logs d'invitations")
    .addChannelOption(option =>
      option.setName("salon")
        .setDescription("Le salon où envoyer les logs")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel("salon");
    const config = loadConfig();
    config[interaction.guildId] = channel.id;
    saveConfig(config);

    const embed = new EmbedBuilder()
      .setTitle("✅ Invite Logger configuré")
      .setColor(0x57f287)
      .setDescription(`Les logs d'invitations seront envoyés dans ${channel}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
