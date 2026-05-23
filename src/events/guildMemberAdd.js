const { Events, EmbedBuilder } = require("discord.js");
const { getGuildSettings } = require("../database/db.js");
const { COLORS } = require("../utils/helpers.js");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const settings = getGuildSettings(member.guild.id);

    if (settings.auto_role) {
      const role = member.guild.roles.cache.get(settings.auto_role);
      if (role) await member.roles.add(role).catch(() => {});
    }

    if (!settings.welcome_channel) return;
    const channel = member.guild.channels.cache.get(settings.welcome_channel);
    if (!channel) return;

    const msg = (settings.welcome_message ?? "Bienvenue {user} sur **{guild}** ! Tu es le **{count}**ème membre ! 🎉")
      .replace("{user}", member.toString())
      .replace("{guild}", member.guild.name)
      .replace("{count}", `${member.guild.memberCount}`);

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle("👋 Nouveau membre !")
          .setDescription(msg)
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() })
          .setTimestamp()
      ]
    });
  }
};
