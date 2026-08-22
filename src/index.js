const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.render("index");
});


(async () => {
    try {
        process.on('unhandledRejection', (err) => console.error('[Erreur non gérée]', err));
process.on('uncaughtException', (err) => console.error('[Exception non gérée]', err));

require("dotenv").config();
const { initDatabase } = require('./database/init.js'); // Import de l'initialisation Turso
const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require("discord.js");
const fs = require("fs");

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
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember],
});

client.commands = new Collection();
const slashCommandsData = [];
const commandsPath = path.join(__dirname, "commands");
for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);
  try {
    for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))) {
      const mod = require(path.join(folderPath, file));
      const cmds = Array.isArray(mod) ? mod : [mod];
      for (const cmd of cmds) {
        if (cmd?.data && cmd?.execute) {
          client.commands.set(cmd.data.name, cmd);
          slashCommandsData.push(cmd.data.toJSON());
        }
      }
    }
  } catch (e) { console.error(e); }
}

const eventsPath = path.join(__dirname, "events");
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"))) {
  const event = require(path.join(eventsPath, file));
  if (event?.name) {
    if (event.once) client.once(event.name, (...args) => event.execute(...args));
    else client.on(event.name, (...args) => event.execute(...args));
  }
}

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!TOKEN || !CLIENT_ID) { console.error("❌ DISCORD_TOKEN et DISCORD_CLIENT_ID sont requis"); process.exit(1); }

client.once("clientReady", async () => {
  const statuses = [
    { name: "En développement", type: 3 },
    { name: "V.1.4.2", type: 3 },
    { name: "Crée par Naoxy", type: 3 },
  ];
  let statusIndex = 0;
  client.user.setPresence({ activities: [statuses[statusIndex]], status: "online" });
  setInterval(() => {
    statusIndex = (statusIndex + 1) % statuses.length;
    client.user.setPresence({ activities: [statuses[statusIndex]], status: "online" });
  }, 10000);

  const rest = new REST().setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommandsData });
    console.log(`✅ ${slashCommandsData.length} slash commands enregistrées globalement.`);
  } catch (e) { console.error(e); }
});

// ── Dashboard Configuration Propre ──




// Route dashboard dynamique propre
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.set("views", path.join(__dirname, "web/views"));

app.get("/dashboard/:guildId", async (req, res) => {
    try {
        const guild = client.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).send("Serveur introuvable ou le bot n y est pas.");
        const channels = Array.from(guild.channels.cache.values());
        const roles = Array.from(guild.roles.cache.values());
        res.render("server", { guild, channels, roles });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


    // Routes du Dashboard Express
            }
        html += "</ul>";
        res.send(html);
    });

    app.get("/dashboard/:guildId", async (req, res) => {
        try {
            let guild = client.guilds.cache.get(req.params.guildId);
            if (!guild) {
                guild = await client.guilds.fetch(req.params.guildId).catch(() => null);
            }
            if (!guild) return res.status(404).send("Serveur introuvable ou le bot n y est pas.");
            
            const channels = Array.from(guild.channels.cache.values());
            const roles = Array.from(guild.roles.cache.values());
            
            try {
                res.render("server", { guild, channels, roles });
            } catch (e) {
                res.send(`<h1>Dashboard de ${guild.name}</h1><p>Salons : ${channels.length} | Rôles : ${roles.length}</p>`);
            }
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error: " + error.message);
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
        console.log("🌐 Serveur Express en écoute sur le port " + PORT);
    });

    
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '..', 'views'));

            }
        html += "</ul></div>";
        res.send(html);
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
            
            const viewsPath = path.join(__dirname, '..', 'views');
            const serverViewPath = path.join(viewsPath, 'server.ejs');
            
            if (fs.existsSync(serverViewPath)) {
                res.render("server", { guild, channels, roles });
            } else {
                let fallbackHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 30px auto; padding: 20px; background: #1e1e1e; color: #fff; border-radius: 8px;">
                        <a href="/" style="color: #5865F2; text-decoration: none;">← Retour à l accueil</a>
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

    await client.login(process.env.TOKEN);

    } catch (err) {
        console.error("[FATAL CRASH] Une erreur critique est survenue au démarrage :", err);
        process.exit(1);
    }
})();

    }
    html += "</ul>";
    res.send(html);
});

app.get("/dashboard/:guildId", async (req, res) => {
    try {
        let guild = client.guilds.cache.get(req.params.guildId);
        if (!guild) {
            guild = await client.guilds.fetch(req.params.guildId).catch(() => null);
        }
        if (!guild) return res.status(404).send("Serveur introuvable ou le bot n y est pas.");
        
        const channels = Array.from(guild.channels.cache.values());
        const roles = Array.from(guild.roles.cache.values());
        
        try {
            res.render("server", { guild, channels, roles });
        } catch (e) {
            res.send(`<h1>Dashboard de ${guild.name}</h1><p>Salons : ${channels.length} | Rôles : ${roles.length}</p>`);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error: " + error.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log("🌐 Serveur Express en écoute sur le port " + PORT);
});
