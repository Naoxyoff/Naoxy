const db = require("../database/db.js").default || require("../database/db.js");

const PLANS = {
  starter: { name: "Starter", price: 4.99, color: 0xcd7f32 },
  pro:     { name: "Pro",     price: 9.99, color: 0xffd700 },
  enterprise: { name: "Enterprise", price: 24.99, color: 0x00bfff }
};

async function getGuildPremium(guildId) {
  const res = await db.execute({
    sql: "SELECT * FROM premium_subscriptions WHERE guild_id = ? AND type = 'guild' AND status = 'active' AND (expires_at IS NULL OR expires_at > unixepoch()) ORDER BY started_at DESC LIMIT 1",
    args: [guildId]
  });
  return res.rows[0] || null;
}

async function getUserPremium(userId) {
  const res = await db.execute({
    sql: "SELECT * FROM premium_subscriptions WHERE user_id = ? AND type = 'user' AND status = 'active' AND (expires_at IS NULL OR expires_at > unixepoch()) ORDER BY started_at DESC LIMIT 1",
    args: [userId]
  });
  return res.rows[0] || null;
}

async function isPremium(guildId, userId) {
  const [g, u] = await Promise.all([getGuildPremium(guildId), getUserPremium(userId)]);
  return !!(g || u);
}

async function activatePremium({ guildId, userId, plan, type, paypalOrderId, price }) {
  const expires = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 jours
  await db.execute({
    sql: `INSERT INTO premium_subscriptions (guild_id, user_id, plan, type, status, paypal_order_id, price, expires_at)
          VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
    args: [guildId || null, userId || null, plan, type, paypalOrderId || null, price, expires]
  });
}

module.exports = { PLANS, getGuildPremium, getUserPremium, isPremium, activatePremium };
