const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../database/db.js').default || require('../database/db.js');
const { COLORS } = require('../utils/helpers.js');
const { createWelcomeImage } = require('../utils/canvas.js');
const path = require('path');

const recentlyProcessedRemove = new Set();

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const key = `${member.guild.id}-${member.id}`;
    if (recentlyProcessedRemove.has(key)) return;
    recentlyProcessedRemove.add(key);
    setTimeout(() => recentlyProcessedRemove.delete(key), 10000);

    try {
      const res = await db.execute({
        sql: "SELECT welcome_channel, leave_message FROM guild_settings WHERE guild_id = ?",
        args: [member.guild.id]
      });
      const settings = res.rows[0];
      if (!settings || !settings.welcome_channel) return;

      const ch = member.guild.channels.cache.get(settings.welcome_channel);
      if (!ch) return;

      const bannerPath = path.join(__dirname, '../assets/banner.png');
      const buffer = await createWelcomeImage(member, bannerPath, 'goodbye');
      const welcomeCanvas = new AttachmentBuilder(buffer, { name: 'goodbye.png' });

      const rawMsg = settings.leave_message ?? "Au revoir **{user}** ! On espère te revoir sur **{guild}** 👏";
      const msg = rawMsg
        .replace(/{user}/g, member.user.username)
        .replace(/{guild}/g, member.guild.name);

      const embed = new EmbedBuilder()
        .setColor(COLORS?.error || 0xef4444)
        .setTitle("Un membre vient de partir...")
        .setDescription(msg)
        .setImage("attachment://goodbye.png")
        .setTimestamp();

      await ch.send({ embeds: [embed], files: [welcomeCanvas] });
    } catch (e) {
      console.error("Erreur guildMemberRemove:", e);
    }
  },
};
