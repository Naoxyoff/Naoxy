const { logInvite } = require("../handlers/inviteLogger");
const { checkRaid } = require("../handlers/protection.js");
const { sendWelcome } = require("../handlers/welcome");
const autoRoleHandler = require("../handlers/autoRoleHandler");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    await logInvite(member);
    await sendWelcome(member);
    await autoRoleHandler.execute(member);
  },
};
