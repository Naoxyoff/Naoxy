const { logMemberRemove } = require("../handlers/logger.js");
const { checkMemberKick } = require("../handlers/antinuke.js");
const { sendLeave } = require("../handlers/welcome.js");
module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    await Promise.all([
      logMemberRemove(member),
      checkMemberKick(member),
      sendLeave(member),
    ]);
  }
};
