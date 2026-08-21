const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { COLORS } = require("../../utils/helpers.js");

const HELP_TEXT = `**🛡️ Modération** *(utilisables à tout moment)*
\`/warn\` — Avertir un membre
\`/warnings\` — Voir les avertissements d'un membre
\`/clearwarn\` — Supprimer les avertissements d'un membre
\`/kick\` — Expulser un membre
\`/ban\` — Bannir (temporaire ou définitif)
\`/unban\` — Débannir via l'ID
\`/unbanall\` — Débannir tout le monde
\`/mute\` / \`/unmute\` — Sourdine (timeout)
\`/sanctions\` — Historique des sanctions d'un membre
\`/slowmode\` — Limiter la fréquence des messages
\`/lock\` / \`/unlock\` — Verrouiller/déverrouiller un salon
\`/clear\` — Supprimer des messages (jusqu'à 500)
\`/logconfig\` — Salon des logs de modération
\`/wipe\` — ⚠️ Réinitialise TOUT (irréversible, propriétaire uniquement)

**🎫 Tickets** *(dans cet ordre)*
1️⃣ \`/ticket addtype\` — Créer un type de ticket
2️⃣ \`/ticket panel\` — Envoyer le bouton d'ouverture
\`/ticket listtypes\` / \`/ticket removetype\` — Gérer les types
*Une fois un ticket ouvert :*
\`/ticket add\` / \`/ticket remove\` — Gérer les membres du ticket
\`/ticket close\` — Fermer le ticket

**📋 Logs**
\`/logs setup\` — Configurer les salons de logs (une seule fois)
\`/logs status\` / \`/logs reset\`
\`/logconfig\` — Salon dédié aux logs de modération

**📥 Invitations**
\`/setinvitelog\` — Salon des logs d'invitations
\`/invites voir\` — Invitations d'un membre
\`/invites classement\` — Classement des inviteurs

**🎉 Giveaways** *(dans cet ordre)*
1️⃣ \`/giveaway start\` — Lancer un giveaway
\`/giveaway list\` — Voir les giveaways en cours (récupérer l'ID)
\`/giveaway end\` — Terminer avant l'heure
\`/giveaway reroll\` — Retirer un gagnant

**🎭 Rôles**
\`/roles autorole add/remove/list\` — Rôle automatique à l'arrivée
\`/roles reactionrole create/add/remove/delete\` — Rôles à cliquer
\`/roles mute set/give/remove\` — Config du rôle muet
\`/roles give\` / \`/roles take\` — Donner/retirer un rôle
\`/roles all\` — Donner/retirer un rôle à tout le monde

**👋 Bienvenue / Départ**
\`/welcome arrivee\` / \`/welcome depart\` — Configurer
\`/welcome test\` — Tester le message
\`/welcome disable\` — Désactiver

**🛡️ Protection (anti-raid / anti-nuke)**
\`/protect set\` — Configurer les seuils (une fois)
\`/protect statut\` — Vérifier la config

**💾 Backup** *(dans cet ordre)*
1️⃣ \`/backup create\` — Sauvegarder l'état du serveur
\`/backup list\` — Voir tes backups (récupérer l'ID)
\`/backup info\` — Détails avant de restaurer
2️⃣ \`/backup load\` — Restaurer ⚠️ (peut supprimer l'existant si "purge" activé)
\`/backup delete\` — Supprimer un backup

**🤖 IA** *(dans cet ordre)*
1️⃣ \`/ai enable\` — Activer
\`/ai persona\` / \`/ai model\` / \`/ai maxtokens\` / \`/ai channel\` — Personnaliser (facultatif)
\`/ai status\` — Vérifier la config
\`/ai disable\` — Désactiver

**ℹ️ Info**
\`/info utilisateur\` — Infos d'un membre
\`/help\` — Affiche ce message`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Voir toutes les commandes du bot et leur ordre d'utilisation"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS?.info || '#7c3aed')
      .setTitle("📖 Commandes d'Orbis")
      .setDescription(HELP_TEXT)
      .setFooter({ text: "Propulsé par l'équipe Seeding Studios 🔥" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
