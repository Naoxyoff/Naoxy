const { Events, EmbedBuilder } = require("discord.js");
const { db, getMemberLevel, levelFromXp, xpForLevel, getGuildSettings } = require("../database/db.js");
const { COLORS } = require("../utils/helpers.js");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guildId) return;
    const gid = message.guildId, uid = message.author.id;
    const settings = getGuildSettings(gid);
    const now = Math.floor(Date.now() / 1000);

    if (settings.levels_enabled) {
      const data = getMemberLevel(gid, uid);
      if (now - data.last_xp >= 60) {
        const xpGain = Math.floor(Math.random() * 15) + 10;
        const oldLevel = levelFromXp(data.xp);
        const newLevel = levelFromXp(data.xp + xpGain);
        db.prepare("UPDATE member_levels SET xp = xp + ?, messages = messages + 1, last_xp = ? WHERE guild_id = ? AND user_id = ?").run(xpGain, now, gid, uid);
        if (newLevel > oldLevel) {
          const msg = (settings.levels_message ?? "{user} vient de passer au niveau **{level}** !").replace("{user}", message.author.toString()).replace("{level}", `${newLevel}`).replace("{guild}", message.guild?.name ?? "");
          const ch = settings.levels_channel ? message.guild?.channels.cache.get(settings.levels_channel) : message.channel;
          if (ch) await ch.send({ embeds: [new EmbedBuilder().setColor(COLORS.gold).setDescription(`🎉 ${msg}`).setThumbnail(message.author.displayAvatarURL())] });
        }
      }
    }

    const prefix = settings.prefix ?? "!";
    if (message.content.startsWith(prefix)) {
      const cmdName = message.content.slice(prefix.length).split(" ")[0].toLowerCase();
      const cmd = db.prepare("SELECT * FROM custom_commands WHERE guild_id = ? AND name = ?").get(gid, cmdName);
      if (cmd) await message.channel.send(cmd.response.replace("{user}", message.author.toString()));
    }

    if (settings.automod_enabled) {
      const content = message.content.toLowerCase();
      if (settings.automod_badwords) {
        const badwords = JSON.parse(settings.automod_badwords);
        if (badwords.some(w => content.includes(w))) {
          await message.delete().catch(() => {});
          const m = await message.channel.send({ content: `${message.author}, ce message a été supprimé. ⚠️` });
          setTimeout(() => m.delete().catch(() => {}), 5000);
          return;
        }
      }
      if (settings.automod_anti_link && /(https?:\/\/|discord\.gg\/)/i.test(message.content)) {
        await message.delete().catch(() => {});
        const m = await message.channel.send({ content: `${message.author}, les liens ne sont pas autorisés. ⚠️` });
        setTimeout(() => m.delete().catch(() => {}), 5000);
        return;
      }
    }

    const countingGame = db.prepare("SELECT * FROM counting WHERE guild_id = ?").get(gid);
    if (countingGame?.channel_id === message.channelId) {
      const num = parseInt(message.content.trim());
      if (isNaN(num) || num !== countingGame.current_number + 1) {
        await message.react("❌").catch(() => {});
        if (!isNaN(num)) {
          await message.channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.error).setDescription(`❌ ${message.author} a cassé la séquence ! Recommencez depuis **1** !`)] });
          db.prepare("UPDATE counting SET current_number = 0, last_user_id = NULL WHERE guild_id = ?").run(gid);
        }
      } else if (countingGame.last_user_id === uid) {
        await message.react("⚠️").catch(() => {});
      } else {
        await message.react("✅").catch(() => {});
        db.prepare("UPDATE counting SET current_number = ?, last_user_id = ?, record = MAX(record, ?) WHERE guild_id = ?").run(num, uid, num, gid);
      }
    }
  },
};
