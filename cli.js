#!/usr/bin/env node
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("==========================================");
console.log(" 🚀 ORBIS.SYS — TERMINAL DE COMMANDES CLI ");
console.log("==========================================");
console.log("Commandes disponibles :");
console.log("  1. /ticket setup   - Configurer le module de tickets");
console.log("  2. /ban            - Bannir un utilisateur du serveur");
console.log("  3. /timeout        - Isoler un utilisateur (Timeout)");
console.log("  4. /ai prompt      - Modifier le prompt système de l'IA");
console.log("  5. /logs channel   - Définir le salon des logs");
console.log("  6. Quitter");
console.log("------------------------------------------\n");

function promptUser() {
    rl.question('Orbis-CLI > ', (answer) => {
        const args = answer.trim().split(' ');
        const cmd = args[0].toLowerCase();

        switch(cmd) {
            case '/ticket':
            case '1':
                console.log("🎫 [TICKET] Configuration du salon de support en cours...");
                break;
            case '/ban':
            case '2':
                console.log(`🛡️ [BAN] Exécution de la sanction contre l'utilisateur ${args[1] || 'inconnu'}...`);
                break;
            case '/timeout':
            case '3':
                console.log(`⏳ [TIMEOUT] Application du silence pour ${args[1] || 'utilisateur'} (${args[2] || '24h'})...`);
                break;
            case '/ai':
            case '4':
                console.log("🤖 [IA] Mise à jour des directives du noyau Groq...");
                break;
            case '/logs':
            case '5':
                console.log(`📜 [LOGS] Enregistrement du nouveau salon cible : ${args[1] || '#logs'}`);
                break;
            case 'exit':
            case 'quit':
                console.log("Fermeture du terminal Orbis.sys. À bientôt !");
                rl.close();
                return;
            default:
                console.log("❌ Commande inconnue. Tape /ticket, /ban, /timeout, /ai, /logs ou exit.");
        }
        console.log("");
        promptUser();
    });
}

promptUser();
