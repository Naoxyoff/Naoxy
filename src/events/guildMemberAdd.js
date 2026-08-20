const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../database/db.js').default || require('../database/db.js');
const { COLORS } = require('../utils/helpers.js');
const { createWelcomeImage } = require('../utils/canvas.js');
const path = require('path');

const recentlyProcessed = new Set();

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const key = `${member.guild.id}-${member.id}`;
    if (recentlyProcessed.has(key)) return;
    recentlyProcessed.add(key);
    setTimeout(() => recentlyProcessed.delete(key), 10000);

    try {
      const settings = db.prepare("SELECT welcome_channel, welcome_message FROM guild_settings WHERE guild_id = ?").get(member.guild.id);
      if (!settings || !settings.welcome_channel) return;

      const ch = member.guild.channels.cache.get(settings.welcome_channel);
      if (!ch) return;

      const bannerPath = path.join(__dirname, '../assets/banner.png');
      const buffer = await createWelcomeImage(member, bannerPath, 'welcome');
      const welcomeCanvas = new AttachmentBuilder(buffer, { name: 'welcome.png' });

      const rawMsg = settings.welcome_message ?? "Bienvenue {user} sur **{guild}** ! Tu es le **{count}**ème membre ! 🎉";
      const msg = rawMsg
        .replace(/{user}/g, member.toString())
        .replace(/{guild}/g, member.guild.name)
        .replace(/{count}/g, `${member.guild.memberCount}`);

      const embed = new EmbedBuilder()
        .setColor(COLORS?.success || 0x10b981)
        .setTitle("Ho ! Un nouveau membre !")
        .setDescription(msg)
        .setImage("attachment://welcome.png")
        .setTimestamp();

      await ch.send({ embeds: [embed], files: [welcomeCanvas] });
    } catch (e) {
      console.error("Erreur guildMemberAdd:", e);
    }
  },
};
