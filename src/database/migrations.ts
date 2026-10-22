import fs from 'fs';
import path from 'path';
import { IDatabase } from './driver';

export async function runMigrations(db: IDatabase): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  let schemaSql = '';

  if (fs.existsSync(schemaPath)) {
    schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  } else {
    // Fallback caso executando em bundle compilado
    const altPath = path.join(process.cwd(), 'src', 'database', 'schema.sql');
    if (fs.existsSync(altPath)) {
      schemaSql = fs.readFileSync(altPath, 'utf-8');
    }
  }

  if (!schemaSql) {
    throw new Error('Arquivo de schema.sql não encontrado para migração.');
  }

  // Executa o schema completo
  db.exec(schemaSql);

  // Campos de catálogo adicionados depois da versão 1 são migrados sem apagar dados existentes.
  const recipeColumns = db.query<{ name: string }>('PRAGMA table_info(recipes)');
  if (!recipeColumns.some(column => column.name === 'budget_swaps')) {
    db.exec("ALTER TABLE recipes ADD COLUMN budget_swaps TEXT NOT NULL DEFAULT '[]'");
  }
  const measurementColumns = db.query<{ name: string }>('PRAGMA table_info(body_measurements)');
  if (!measurementColumns.some(column => column.name === 'shoulder_circ_cm')) {
    db.exec('ALTER TABLE body_measurements ADD COLUMN shoulder_circ_cm REAL');
  }
  const workoutSetColumns = db.query<{ name: string }>('PRAGMA table_info(workout_sets)');
  if (!workoutSetColumns.some(column => column.name === 'rpe')) {
    db.exec('ALTER TABLE workout_sets ADD COLUMN rpe REAL CHECK(rpe BETWEEN 1 AND 10)');
  }
  const foodColumns = db.query<{ name: string }>('PRAGMA table_info(foods)');
  if (!foodColumns.some(column => column.name === 'substitute_group_id')) {
    db.exec('ALTER TABLE foods ADD COLUMN substitute_group_id TEXT');
  }
  if (!foodColumns.some(column => column.name === 'image_url')) {
    db.exec('ALTER TABLE foods ADD COLUMN image_url TEXT');
  }
  if (!foodColumns.some(column => column.name === 'image_credit')) {
    db.exec('ALTER TABLE foods ADD COLUMN image_credit TEXT');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_foods_substitute_group ON foods(substitute_group_id)');
  const recipeCatalogColumns = db.query<{ name: string }>('PRAGMA table_info(recipes)');
  if (!recipeCatalogColumns.some(column => column.name === 'image_url')) {
    db.exec('ALTER TABLE recipes ADD COLUMN image_url TEXT');
  }
  if (!recipeCatalogColumns.some(column => column.name === 'image_credit')) {
    db.exec('ALTER TABLE recipes ADD COLUMN image_credit TEXT');
  }
  const exerciseColumns = db.query<{ name: string }>('PRAGMA table_info(exercises)');
  if (!exerciseColumns.some(column => column.name === 'description')) {
    db.exec('ALTER TABLE exercises ADD COLUMN description TEXT');
  }
  if (!exerciseColumns.some(column => column.name === 'execution_tips')) {
    db.exec('ALTER TABLE exercises ADD COLUMN execution_tips TEXT');
  }
  if (!exerciseColumns.some(column => column.name === 'image_url')) {
    db.exec('ALTER TABLE exercises ADD COLUMN image_url TEXT');
  }
  if (!exerciseColumns.some(column => column.name === 'image_credit')) {
    db.exec('ALTER TABLE exercises ADD COLUMN image_credit TEXT');
  }
  if (!exerciseColumns.some(column => column.name === 'youtube_url')) {
    db.exec('ALTER TABLE exercises ADD COLUMN youtube_url TEXT');
  }
  db.exec(`CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  // Registra a versão 1 se não existir
  const row = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 1');
  if (!row) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [1, 'Initial Schema — FitTrack Personal', new Date().toISOString()]
    );
  }

  const version2 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 2');
  if (!version2) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [2, 'Catálogos locais e alternativas econômicas de receitas', new Date().toISOString()]
    );
  }

  const version3 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 3');
  if (!version3) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [3, 'Projeções físicas locais e medida de ombros', new Date().toISOString()]
    );
  }

  const version4 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 4');
  if (!version4) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [4, 'Mídia de demonstração e RPE por série', new Date().toISOString()]
    );
  }

  const version5 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 5');
  if (!version5) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [5, 'Preferências visuais e biblioteca de mídia local do editor de layout', new Date().toISOString()]
    );
  }

  const version6 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 6');
  if (!version6) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [6, 'Imagens, vídeos e grupos de equivalência nutricional dos catálogos', new Date().toISOString()]
    );
  }

  const version7 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 7');
  if (!version7) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [7, 'Checklist diário de refeições com consumo real por ingrediente', new Date().toISOString()]
    );
  }
}
