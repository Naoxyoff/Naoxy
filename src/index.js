require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildInvites,
    ]
});

app.get("/", (req, res) => {
    try {
        const guilds = Array.from(client.guilds.cache.values());
        let html = `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #1e1e1e; color: #fff; border-radius: 8px;">
                <h1 style="color: #5865F2;">🤖 Orbis Dashboard</h1>
                <p>Le bot est en ligne et connecté à Discord !</p>
                <h3>Serveurs connectés (${guilds.length}) :</h3>
                <ul style="list-style: none; padding: 0;">
        `;
        
        if (guilds.length === 0) {
            html += "<li style='padding: 10px; background: #2f3136; margin-bottom: 5px; border-radius: 4px;'>Aucun serveur trouvé ou bot en cours de chargement...</li>";
        } else {
            guilds.forEach(g => {
                html += `<li style="padding: 10px; background: #2f3136; margin-bottom: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${g.name}</strong> <small style="color: #b9bbbe;">(ID: ${g.id})</small></span>
                    <a href="/dashboard/${g.id}" style="background: #5865F2; color: #fff; padding: 6px 12px; border-radius: 4px; text-decoration: none;">Accéder au Dashboard</a>
                </li>`;
            });
        }
        html += "</ul></div>";
        res.send(html);
    } catch (err) {
        res.status(500).send("Erreur: " + err.message);
    }
});

app.get("/dashboard/:guildId", async (req, res) => {
    try {
        let guild = client.guilds.cache.get(req.params.guildId);
        if (!guild) {
            guild = await client.guilds.fetch(req.params.guildId).catch(() => null);
        }
        if (!guild) return res.status(404).send("<h2 style='color:red; text-align:center; margin-top:50px;'>❌ Serveur introuvable ou le bot n'y est pas.</h2>");
        
        const channels = Array.from(guild.channels.cache.values());
        const roles = Array.from(guild.roles.cache.values());
        
        const serverViewPath = path.join(__dirname, "..", "views", "server.ejs");
        
        if (fs.existsSync(serverViewPath)) {
            res.render("server", { guild, channels, roles });
        } else {
            let fallbackHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 30px auto; padding: 20px; background: #1e1e1e; color: #fff; border-radius: 8px;">
                    <a href="/" style="color: #5865F2; text-decoration: none;">← Retour à l'accueil</a>
                    <h1 style="color: #5865F2; margin-top: 15px;">📊 Dashboard : ${guild.name}</h1>
                    <hr style="border: 0; border-top: 1px solid #444;">
                    <div style="display: flex; gap: 20px; margin-top: 20px;">
                        <div style="flex: 1; background: #2f3136; padding: 15px; border-radius: 6px;">
                            <h3>📢 Salons (${channels.length})</h3>
                            <ul style="max-height: 250px; overflow-y: auto; padding-left: 15px; color: #b9bbbe;">
                                ${channels.map(c => `<li>${c.name}</li>`).join('')}
                            </ul>
                        </div>
                        <div style="flex: 1; background: #2f3136; padding: 15px; border-radius: 6px;">
                            <h3>🛡️ Rôles (${roles.length})</h3>
                            <ul style="max-height: 250px; overflow-y: auto; padding-left: 15px; color: #b9bbbe;">
                                ${roles.map(r => `<li style="color: ${r.hexColor || '#fff'}">${r.name}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            res.send(fallbackHtml);
        }
    } catch (error) {
        console.error("Erreur dashboard:", error);
        res.status(500).send("<h2 style='color:red; text-align:center; margin-top:50px;'>500 Internal Server Error: " + error.message + "</h2>");
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("🌐 Serveur Express en écoute sur le port " + PORT);
});

client.once("ready", () => {
    console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
});

client.login(process.env.TOKEN);
