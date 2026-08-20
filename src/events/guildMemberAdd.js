const { EmbedBuilder } = require("discord.js");
const { default: db } = require("../database/db.js");
const { COLORS } = require("../utils/helpers.js");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    const gid = member.guild.id;

    const res = await db.execute({
      sql: "SELECT welcome_channel, welcome_message, welcome_title, welcome_image FROM guild_settings WHERE guild_id = ?",
      args: [gid]
    });
    
    const settings = res.rows[0];
    if (!settings || !settings.welcome_channel) return;

    const channel = member.guild.channels.cache.get(settings.welcome_channel);
    if (!channel) return;

    const rawMsg = settings.welcome_message ?? "Bienvenue {user} sur **{guild}** ! Tu es le **{count}**ème membre ! 🎉";
    const msg = rawMsg
      .replace(/{user}/g, member.toString())
      .replace(/{username}/g, member.user.username)
      .replace(/{guild}/g, member.guild.name)
      .replace(/{count}/g, `${member.guild.memberCount}`);

    const title = settings.welcome_title || "Ho ! Un nouveau membre !";

    const embed = new EmbedBuilder()
      .setColor(COLORS.success || "#22c55e")
      .setTitle(title)
      .setDescription(msg)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    if (settings.welcome_image) {
      embed.setImage(settings.welcome_image);
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
  }
};
