const { checkWebhookCreate } = require("../handlers/antinuke.js");

module.exports = {
  name: "webhookUpdate",
  async execute(channel) {
    await checkWebhookCreate(channel);
  },
};
