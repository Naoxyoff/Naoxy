const { logVoiceStateUpdate } = require("../handlers/logger.js");
module.exports = { name: "voiceStateUpdate", async execute(o, n) { await logVoiceStateUpdate(o, n); } };
