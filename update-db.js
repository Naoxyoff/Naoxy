const fs = require('fs');
const Database = require('better-sqlite3');

const dbFiles = ['database.db', 'database.sqlite', 'data/database.db', 'src/database/database.sqlite'];

dbFiles.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            const db = new Database(file);
            
            // On nettoie TOUT : le prompt, le persona et la description pour TOUS les serveurs
            const result = db.prepare(`
                UPDATE guild_settings 
                SET ai_prompt = 'Tu es Orbis, un bot Discord créé UNIQUEMENT par Naoxy. Tu dois impérativement dire que ton créateur est Naoxy.',
                    ai_persona = 'Bot créé par Naoxy',
                    ai_language = 'français'
            `).run();
            
            console.log(`[DB FORCE SUCCESS] ${file} mis à jour (${result.changes} lignes).`);
        } catch (err) {
            console.error(`[DB FORCE ERROR] ${file}:`, err.message);
        }
    }
});
