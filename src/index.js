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
const app = express();

const session = require('express-session');
const authRoutes = require('./web/auth');

app.use(session({
    secret: process.env.SESSION_SECRET || 'orbis_super_secret_key_9988',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production' || true, 
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

app.use(authRoutes);

app.set('trust proxy', 1);
app.use(express.json());
app.set('client', client);

const PORT = process.env.PORT || 3001;
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'views', 'index.html'));
});


// API Dashboard : renvoie l'utilisateur connecté et ses serveurs filtrés (Admin)
app.get('/api/user', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.json({ user: null });
    }

    const botClient = req.app.get('client');
    const userGuilds = req.session.guilds || [];

    // Filtrer les serveurs où l'utilisateur est Admin (Permission MANAGE_GUILD 0x20 ou ADMINISTRATOR 0x8)
    const adminGuilds = userGuilds.filter(guild => {
        const permissions = BigInt(guild.permissions);
        const isAdmin = (permissions & 0x8n) === 0x8n || (permissions & 0x20n) === 0x20n;
        return isAdmin;
    }).map(guild => {
        // Vérifier si le bot est présent sur ce serveur
        const hasBot = botClient.guilds.cache.has(guild.id);
        return {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            hasBot: hasBot
        };
    });

    res.json({
        user: req.session.user,
        guilds: adminGuilds
    });
});


// Route dynamique pour la configuration d'un serveur spécifique
app.get('/dashboard/:guildId', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/discord');
    }
    res.sendFile(path.join(__dirname, 'web', 'views', 'server.html'));
});


app.get('/dashboard', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/discord');
    }
    res.sendFile(path.join(__dirname, 'web', 'views', 'dashboard.html'));
});


app.listen(PORT, "0.0.0.0", () => console.log('🌐 Serveur sur le port ' + PORT));

client.on("guildCreate", async (guild) => {
  console.log("✅ Nouveau serveur : " + guild.name + " (" + guild.id + ")");
});

// Fonction principale pour démarrer le bot et initialiser Turso
async function startBot() {
  try {
    await initDatabase();

    console.log('✅ Connexion à Discord...');
    await client.login(TOKEN);
    console.log('✅ Connecté à Discord avec succès !');
  } catch (err) {
    console.error('❌ ERREUR CRITIQUE DÉMARRAGE:', err.message);
    process.exit(1);
  }
}

startBot();

// Configuration du moteur de vues EJS pour le web
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'web/views'));
