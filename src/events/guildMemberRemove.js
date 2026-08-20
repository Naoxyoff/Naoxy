const { EmbedBuilder } = require("discord.js");
const { default: db } = require("../database/db.js");
const { COLORS } = require("../utils/helpers.js");

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    const gid = member.guild.id;

    const res = await db.execute({
      sql: "SELECT leave_channel, leave_message, leave_title, leave_image FROM guild_settings WHERE guild_id = ?",
      args: [gid]
    });
    
    const settings = res.rows[0];
    if (!settings || !settings.leave_channel) return;

    const channel = member.guild.channels.cache.get(settings.leave_channel);
    if (!channel) return;

    const rawMsg = settings.leave_message ?? "Au revoir **{user}** ! On espère te revoir sur **{guild}** 👋";
    const msg = rawMsg
      .replace(/{user}/g, member.toString())
      .replace(/{username}/g, member.user.username)
      .replace(/{guild}/g, member.guild.name);

    const title = settings.leave_title || "Un membre vient de partir...";

    const embed = new EmbedBuilder()
      .setColor(COLORS.error || "#ef4444") // Rouge pour le départ
      .setTitle(title)
      .setDescription(msg)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    if (settings.leave_image) {
      embed.setImage(settings.leave_image);
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
  }
};
