const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { default: db } = require("../database/db.js");
const { COLORS } = require("../utils/helpers.js");
const { createWelcomeImage } = require("../utils/canvas.js");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    const gid = member.guild.id;

    const res = await db.execute({
      sql: "SELECT welcome_channel, welcome_message FROM guild_settings WHERE guild_id = ?",
      args: [gid]
    });
    
    const settings = res.rows[0];
    if (!settings || !settings.welcome_channel) return;

    const channel = member.guild.channels.cache.get(settings.welcome_channel);
    if (!channel) return;

    try {
      const bannerUrl = "https://cdn.discordapp.com/attachments/1539848384188256346/1540052962033016965/content.png";
      const buffer = await createWelcomeImage(member, bannerUrl);
      const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });

      const rawMsg = settings.welcome_message ?? "Bienvenue {user} sur **{guild}** ! Tu es le **{count}**ème membre ! 🎉";
      const msg = rawMsg
        .replace(/{user}/g, member.toString())
        .replace(/{username}/g, member.user.username)
        .replace(/{guild}/g, member.guild.name)
        .replace(/{count}/g, `${member.guild.memberCount}`);

      const embed = new EmbedBuilder()
        .setColor(COLORS.success || "#22c55e")
        .setTitle("Ho ! Un nouveau membre !")
        .setDescription(msg)
        .setImage("attachment://welcome.png")
        .setTimestamp();

      await channel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
    } catch (e) {
      console.error("Erreur lors de la génération de l'image de bienvenue:", e);
    }
  }
};
