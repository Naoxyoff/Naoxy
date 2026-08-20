process.on('unhandledRejection', (err) => console.error('[Erreur non gérée]', err));
process.on('uncaughtException', (err) => console.error('[Exception non gérée]', err));

require('../update-db.js');
const { initDatabase } = require('./database/init.js'); // Import de l'initialisation Turso
const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

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
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);
  const statuses = [
    { name: "En développement", type: 3 },
    { name: "V.1.3.7", type: 3 },
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
    console.log("📡 Enregistrement des slash commands en global...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommandsData });
    console.log(`✅ ${slashCommandsData.length} slash commands enregistrées globalement.`);
  } catch (e) { console.error(e); }
});

// ── Dashboard Configuration Propre ──
const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.set('client', client);

const PORT = process.env.PORT || 3001;
app.get('/', (req, res) => res.send('OK'));
app.listen(PORT, "0.0.0.0", () => console.log('🌐 Serveur sur le port ' + PORT));

// ── Whitelist ──
const WHITELIST = [
  "1469110978028245168",
  "1499908548585459792",
  "1509358317862916218",
];

client.on("guildCreate", async (guild) => {
  if (!WHITELIST.includes(guild.id)) {
    console.log("❌ Serveur non autorisé : " + guild.name + " (" + guild.id + ") — départ automatique");
    await guild.leave();
  } else {
    console.log("✅ Nouveau serveur autorisé : " + guild.name);
  }
});


// Fonction principale pour démarrer le bot et initialiser Turso
async function startBot() {
  try {
    console.log('🔄 Initialisation de la base de données Turso...');
    await initDatabase();

    console.log('🔑 Connexion à Discord...');
    await client.login(process.env.DISCORD_TOKEN);
    console.log('✅ Connecté à Discord avec succès !');
  } catch (err) {
    console.error('❌ ERREUR CRITIQUE DÉMARRAGE:', err.message);
  }
}

startBot();


console.log('--- DIAGNOSTIC --- ');
console.log('TOKEN EXISTE ?', !!process.env.DISCORD_TOKEN);
client.login(process.env.DISCORD_TOKEN).catch(e => console.error('ERREUR EXACTE:', e));


console.log('--- DIAGNOSTIC RENDER --- ');
console.log('TOKEN DETECTE ?', !!process.env.DISCORD_TOKEN);
if(process.env.DISCORD_TOKEN) console.log('LONGUEUR TOKEN :', process.env.DISCORD_TOKEN.length);
client.login(process.env.DISCORD_TOKEN).catch(e => console.error('❌ ERREUR LOGIN RENDER :', e.message));
