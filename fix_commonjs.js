const fs = require('fs');
const path = require('path');

// 1. Remettre le package.json en CommonJS pour conserver la compatibilité avec require()
const pkgPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.type = 'commonjs';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

// 2. Nettoyer directement les lignes contenant DB FORCE SUCCESS dans les fichiers de code
function cleanDbLogs(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      cleanDbLogs(fullPath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('DB FORCE SUCCESS')) {
        const cleaned = content.split('\n').filter(line => !line.includes('DB FORCE SUCCESS')).join('\n');
        fs.writeFileSync(fullPath, cleaned);
      }
    }
  }
}

cleanDbLogs('./src');
