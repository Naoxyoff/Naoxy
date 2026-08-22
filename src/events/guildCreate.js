const { Events } = require("discord.js");

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    console.log(`✅ Nouveau serveur : ${guild.name} (${guild.id})`);
  }
};
