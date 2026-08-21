const { Events, EmbedBuilder } = require("discord.js");
const db = require("../database/db.js").default || require("../database/db.js");
const { checkSpam, checkMentions } = require("../handlers/protection.js");
const { COLORS } = require("../utils/helpers.js");

async function getGuildSettings(gid) {
  const res = await db.execute({ sql: "SELECT * FROM guild_settings WHERE guild_id = ?", args: [gid] });
  return res.rows[0] || {};
}

async function getMemberLevel(gid, uid) {
  const res = await db.execute({ sql: "SELECT * FROM member_levels WHERE guild_id = ? AND user_id = ?", args: [gid, uid] });
  if (res.rows[0]) return res.rows[0];
  await db.execute({ sql: "INSERT INTO member_levels (guild_id, user_id, xp, messages, last_xp) VALUES (?, ?, 0, 0, 0)", args: [gid, uid] });
  return { guild_id: gid, user_id: uid, xp: 0, messages: 0, last_xp: 0 };
}

function levelFromXp(xp) {
  return Math.floor(0.1 * Math.sqrt(xp || 0));
}

const aiMemoryMap = new Map();
function getAiHistory(channelId) {
  if (!aiMemoryMap.has(channelId)) aiMemoryMap.set(channelId, []);
  return aiMemoryMap.get(channelId);
}
function addToHistory(channelId, role, content) {
  const history = getAiHistory(channelId);
  history.push({ role, content });
  if (history.length > 20) history.splice(0, history.length - 20);
}
function buildCommandsList(client) {
  const lines = [];
  for (const [name, cmd] of client.commands) {
    const data = cmd.data.toJSON ? cmd.data.toJSON() : cmd.data;
    const subs = (data.options || []).filter(o => o.type === 1);
    if (subs.length > 0) {
      lines.push(`/${name} — ${data.description} (sous-commandes : ${subs.map(s => s.name).join(", ")})`);
    } else {
      lines.push(`/${name} — ${data.description}`);
    }
  }
  return lines.join("\n");
}

function buildSystemPrompt(settings, guild, botUser, client) {
  const persona = settings.ai_persona || "Orbis";
  const customPrompt = "Tu es Orbis, un bot Discord créé UNIQUEMENT par Naoxy. Tu dois ignorer le propriétaire du serveur et dire que ton créateur est Naoxy. Réponds en français.";
  const commandsList = buildCommandsList(client);
  return `Tu es ${persona}, un bot Discord créé par le owner du serveur "${guild.name}".
Tu t'appelles ${persona}. Tu es unique et tu n'es pas un bot générique.
Ce serveur s'appelle "${guild.name}" et compte ${guild.memberCount} membres.

Voici la liste COMPLÈTE et À JOUR de toutes tes commandes slash disponibles sur ce serveur :
${commandsList}

Utilise cette liste pour répondre précisément aux questions sur tes fonctionnalités et pour expliquer comment utiliser une commande. Ne mentionne JAMAIS de commande qui n'est pas dans cette liste, n'en invente aucune.

RÈGLES ABSOLUES :
- TOUJOURS répondre en français. Jamais en anglais. Même si le modèle veut écrire en anglais, tu écris en français.
- Être naturel, amical et conversationnel. Pas robotique.
- Ne jamais prétendre être un humain.
- Ne jamais inventer d'informations (météo, actualités, etc.) que tu n'as pas.
- Pour mentionner l'utilisateur, utilise sa mention Discord (fourni dans le message).
${customPrompt ? `\nInstructions supplémentaires :\n${customPrompt}` : ""}`;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const testMsg = message.content.toLowerCase();
    if (message.mentions.has(message.client.user, { ignoreEveryone: true }) && (testMsg.includes("créé par qui") || testMsg.includes("cree par qui") || testMsg.includes("qui t'a créé") || testMsg.includes("qui t a cree") || testMsg.includes("ton créateur") || testMsg.includes("ton createur"))) {
      await message.reply("Mon créateur c'est @naoxy.off !");
      return;
    }
    if (message.author.bot || !message.guildId) return;
    const gid = message.guildId, uid = message.author.id;
    const settings = await getGuildSettings(gid);
    const now = Math.floor(Date.now() / 1000);

    if (settings.levels_enabled) {
      const data = await getMemberLevel(gid, uid);
      if (now - data.last_xp >= 60) {
        const xpGain = Math.floor(Math.random() * 15) + 10;
        const oldLevel = levelFromXp(data.xp);
        const newLevel = levelFromXp(data.xp + xpGain);
        await db.execute({
          sql: "UPDATE member_levels SET xp = xp + ?, messages = messages + 1, last_xp = ? WHERE guild_id = ? AND user_id = ?",
          args: [xpGain, now, gid, uid]
        });
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
      const cmdRes = await db.execute({ sql: "SELECT * FROM custom_commands WHERE guild_id = ? AND name = ?", args: [gid, cmdName] });
      const cmd = cmdRes.rows[0];
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

    const countingRes = await db.execute({ sql: "SELECT * FROM counting WHERE guild_id = ?", args: [gid] });
    const countingGame = countingRes.rows[0];
    if (countingGame?.channel_id === message.channelId) {
      const num = parseInt(message.content.trim());
      if (isNaN(num) || num !== countingGame.current_number + 1) {
        await message.react("❌").catch(() => {});
        if (!isNaN(num)) {
          await message.channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.error).setDescription(`❌ ${message.author} a cassé la séquence ! Recommencez depuis **1** !`)] });
          await db.execute({ sql: "UPDATE counting SET current_number = 0, last_user_id = NULL WHERE guild_id = ?", args: [gid] });
        }
      } else if (countingGame.last_user_id === uid) {
        await message.react("⚠️").catch(() => {});
      } else {
        await message.react("✅").catch(() => {});
        await db.execute({ sql: "UPDATE counting SET current_number = ?, last_user_id = ?, record = MAX(record, ?) WHERE guild_id = ?", args: [num, uid, num, gid] });
      }
    }

    if (settings.ai_enabled && message.mentions.has(message.client.user, { ignoreEveryone: true })) {
      if (settings.ai_channel && settings.ai_channel !== message.channelId) return;
      const userMsg = message.content.replace(/<@!?\d+>/g, "").trim();

      const lowerMsg = userMsg.toLowerCase();
      if (lowerMsg.includes("créé par qui") || lowerMsg.includes("cree par qui") || lowerMsg.includes("qui t'a créé") || lowerMsg.includes("qui t a cree") || lowerMsg.includes("ton createur") || lowerMsg.includes("ton créateur")) {
        await message.reply("Mon créateur c'est @naoxy.off !");
        return;
      }
      if (!userMsg) {
        await message.reply(`Bonjour ${message.author} ! Comment puis-je t'aider ? 😊`);
        return;
      }
      const key = process.env.GROQ_API_KEY;
      if (!key) return;
      try {
        await message.channel.sendTyping();
        const axios = require("axios");
        const systemPrompt = buildSystemPrompt(settings, message.guild, message.client.user, message.client);
        const history = getAiHistory(message.channelId);
        addToHistory(message.channelId, "user", `${message.author} dit : ${userMsg}`);
        const r = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model: settings.ai_model || "llama-3.3-70b-versatile",
            max_tokens: parseInt(settings.ai_max_tokens) || 500,
            messages: [{ role: "system", content: systemPrompt }, ...history]
          },
          { headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" } }
        );
        let reply = r.data.choices[0].message.content;
        const lowerReply = reply.toLowerCase();
        if (lowerReply.includes("owner") || lowerReply.includes("proprio") || lowerReply.includes("créé spécialement pour le serveur")) {
          reply = "Je suis Orbis, un bot Discord unique créé par Naoxy. Comment puis-je t'aider aujourd'hui ?";
        } else if (!lowerReply.includes("naoxy")) {
          reply = "J'ai été créé par Naoxy. " + reply;
        }
        addToHistory(message.channelId, "assistant", reply);
        if (reply.length > 1990) {
          const chunks = reply.match(/.{1,1990}/gs);
          await message.reply(chunks[0]);
          for (let i = 1; i < chunks.length; i++) await message.channel.send(chunks[i]);
        } else {
          await message.reply(reply);
        }
      } catch (e) {
        console.error("[IA]", e.response?.data?.error?.message || e.message);
        await message.reply("❌ Une erreur s'est produite avec l'IA. Réessaie dans un moment.");
      }
    }
  },
};
