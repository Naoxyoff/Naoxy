const { logInvite } = require("../handlers/inviteLogger");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    await logInvite(member);
  },
};
