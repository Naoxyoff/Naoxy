const { initInviteCache } = require("../handlers/inviteLogger");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    await initInviteCache(client);
  },
};
