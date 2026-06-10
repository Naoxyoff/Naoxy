const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Liste des bases de données possibles sur Railway
const dbFiles = ['database.db', 'database.sqlite', 'data/database.db', 'src/database/database.sqlite'];

dbFiles.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            const db = new Database(file);
            // On met à jour TOUS les serveurs pour être sûr de cibler le bon L.S.P.D Tips
            const result = db.prepare("UPDATE guild_settings SET ai_prompt = 'Tu es Orbis, un bot Discord créé par Naoxy. Réponds de manière amicale et utile en français.'").run();
            console.log(`[DB SUCCESS] Modifié ${file} (${result.changes} lignes affectées)`);
        } catch (err) {
            console.error(`[DB ERROR] Impossible de modifier ${file}:`, err.message);
        }
    }
});
