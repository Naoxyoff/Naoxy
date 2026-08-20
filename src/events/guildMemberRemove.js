const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../database/db.js').default || require('../database/db.js');
const { COLORS } = require('../utils/helpers.js');
const { createWelcomeImage } = require('../utils/canvas.js');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (member.user.bot) return;

    try {
      const res = await db.execute({
        sql: "SELECT leave_channel, leave_message FROM guild_settings WHERE guild_id = ?",
        args: [member.guild.id]
      });
      const settings = res.rows[0];
      console.log("Données BDD leave:", settings);
      if (!settings || !settings.leave_channel) return;

      const ch = member.guild.channels.cache.get(settings.leave_channel);
      if (!ch) return;

      const buffer = await createWelcomeImage(member, null, 'goodbye');
      const attachment = new AttachmentBuilder(buffer, { name: 'goodbye_final_v100.png' });

      const rawMsg = settings.leave_message ?? "Au revoir **{user}** ! On espère te revoir sur **{guild}** 👋";
      const msg = rawMsg
        .replace(/{user}/g, member.user.username)
        .replace(/{guild}/g, member.guild.name);

      const embed = new EmbedBuilder()
        .setColor(COLORS?.error || 0xef4444)
        .setTitle("Un membre vient de partir...")
        .setDescription(msg)
        .setImage("attachment://goodbye_final_v100.png")
        .setTimestamp();

      await ch.send({ embeds: [embed], files: [attachment] });
    } catch (e) {
      console.error("Erreur guildMemberRemove:", e);
    }
  },
};