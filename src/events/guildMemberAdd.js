const { logMemberAdd } = require("../handlers/logger.js");
const { checkRaid } = require("../handlers/protection.js");
const { sendWelcome } = require("../handlers/welcome.js");
module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    await Promise.all([
      logMemberAdd(member),
      checkRaid(member),
      sendWelcome(member),
    ]);
  }
};
