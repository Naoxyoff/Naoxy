const db = require("../database/db.js").default || require("../database/db.js");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    const res = await db.execute({ sql: "SELECT * FROM autoroles WHERE guild_id = ?", args: [member.guild.id] });
    for (const row of res.rows) {
      if (row.type === "bot" && !member.user.bot) continue;
      if (row.type === "human" && member.user.bot) continue;
      try { await member.roles.add(row.role_id); } catch {}
    }
  }
};
