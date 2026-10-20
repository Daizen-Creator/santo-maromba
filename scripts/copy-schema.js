const fs = require('fs');
const path = require('path');

const destDir = path.join(__dirname, '..', 'dist-electron', 'database');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(
  path.join(__dirname, '..', 'src', 'database', 'schema.sql'),
  path.join(destDir, 'schema.sql')
);

console.log('[Build] schema.sql copiado com sucesso para dist-electron/database/schema.sql');
