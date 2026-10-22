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
  if (!measurementColumns.some(column => column.name === 'height_cm')) {
    db.exec('ALTER TABLE body_measurements ADD COLUMN height_cm REAL CHECK(height_cm IS NULL OR height_cm BETWEEN 100 AND 250)');
  }
  if (!measurementColumns.some(column => column.name === 'shoulder_circ_cm')) {
    db.exec('ALTER TABLE body_measurements ADD COLUMN shoulder_circ_cm REAL');
  }
  const photoColumns = db.query<{ name: string }>('PRAGMA table_info(photos)');
  if (!photoColumns.some(column => column.name === 'weight_kg_at_photo')) {
    db.exec('ALTER TABLE photos ADD COLUMN weight_kg_at_photo REAL CHECK(weight_kg_at_photo IS NULL OR weight_kg_at_photo > 0)');
  }
  const workoutSetColumns = db.query<{ name: string }>('PRAGMA table_info(workout_sets)');
  if (!workoutSetColumns.some(column => column.name === 'rpe')) {
    db.exec('ALTER TABLE workout_sets ADD COLUMN rpe REAL CHECK(rpe BETWEEN 1 AND 10)');
  }
  const currentWorkoutSetColumns = db.query<{ name: string }>('PRAGMA table_info(workout_sets)');
  if (!currentWorkoutSetColumns.some(column => column.name === 'completed')) {
    db.exec('ALTER TABLE workout_sets ADD COLUMN completed INTEGER NOT NULL DEFAULT 1');
  }
  if (!currentWorkoutSetColumns.some(column => column.name === 'rir')) {
    db.exec('ALTER TABLE workout_sets ADD COLUMN rir REAL CHECK(rir BETWEEN 0 AND 10)');
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
  if (!foodColumns.some(column => column.name === 'data_quality')) {
    db.exec("ALTER TABLE foods ADD COLUMN data_quality TEXT NOT NULL DEFAULT 'unverified'");
  }
  if (!foodColumns.some(column => column.name === 'source_reference')) {
    db.exec('ALTER TABLE foods ADD COLUMN source_reference TEXT');
  }
  if (!foodColumns.some(column => column.name === 'source_date')) {
    db.exec('ALTER TABLE foods ADD COLUMN source_date TEXT');
  }
  if (!foodColumns.some(column => column.name === 'confidence_level')) {
    db.exec("ALTER TABLE foods ADD COLUMN confidence_level TEXT NOT NULL DEFAULT 'unknown'");
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_foods_substitute_group ON foods(substitute_group_id)');
  const recipeCatalogColumns = db.query<{ name: string }>('PRAGMA table_info(recipes)');
  if (!recipeCatalogColumns.some(column => column.name === 'servings')) {
    db.exec('ALTER TABLE recipes ADD COLUMN servings INTEGER NOT NULL DEFAULT 1 CHECK(servings BETWEEN 1 AND 50)');
  }
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

  const version8 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 8');
  if (!version8) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [8, 'Proveniência e qualidade dos dados nutricionais', new Date().toISOString()]
    );
  }

  const version9 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 9');
  if (!version9) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [9, 'Conclusão individual de séries e sessões parciais de treino', new Date().toISOString()]
    );
  }

  const version10 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 10');
  if (!version10) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [10, 'Rendimento de porções editável para receitas', new Date().toISOString()]
    );
  }

  const version11 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 11');
  if (!version11) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [11, 'Modelos reutilizáveis de refeições do usuário', new Date().toISOString()]
    );
  }

  const version12 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 12');
  if (!version12) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [12, 'Repetições em reserva (RIR) por série', new Date().toISOString()]
    );
  }

  const version13 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 13');
  if (!version13) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [13, 'Modelos reutilizáveis de treinos do usuário', new Date().toISOString()]
    );
  }

  const version14 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 14');
  if (!version14) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [14, 'Agenda de treino, descanso e deload do usuário', new Date().toISOString()]
    );
  }

  const version15 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 15');
  if (!version15) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [15, 'Snapshot do peso registrado na data da foto', new Date().toISOString()]
    );
  }

  const version16 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 16');
  if (!version16) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [16, 'Definições e histórico de medidas corporais personalizadas', new Date().toISOString()]
    );
  }

  const version17 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 17');
  if (!version17) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [17, 'Histórico datado de objetivos e pesos-alvo do perfil', new Date().toISOString()]
    );
  }

  const version18 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 18');
  if (!version18) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [18, 'Histórico de altura corporal por data', new Date().toISOString()]
    );
  }

  const profileColumns = db.query<{ name: string }>('PRAGMA table_info(profiles)');
  if (!profileColumns.some(column => column.name === 'wake_time')) {
    db.exec("ALTER TABLE profiles ADD COLUMN wake_time TEXT CHECK(wake_time IS NULL OR (wake_time GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(wake_time, 1, 2) BETWEEN '00' AND '23'))");
  }
  if (!profileColumns.some(column => column.name === 'sleep_time')) {
    db.exec("ALTER TABLE profiles ADD COLUMN sleep_time TEXT CHECK(sleep_time IS NULL OR (sleep_time GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(sleep_time, 1, 2) BETWEEN '00' AND '23'))");
  }
  if (!profileColumns.some(column => column.name === 'training_weekdays')) {
    db.exec('ALTER TABLE profiles ADD COLUMN training_weekdays TEXT');
  }
  if (!profileColumns.some(column => column.name === 'target_date')) {
    db.exec("ALTER TABLE profiles ADD COLUMN target_date TEXT CHECK(target_date IS NULL OR (length(target_date) = 10 AND target_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'))");
  }
  const version19 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 19');
  if (!version19) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [19, 'Horários estruturados de acordar e dormir para o plano alimentar', new Date().toISOString()]
    );
  }
  const version20 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 20');
  if (!version20) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [20, 'Dias disponíveis para encaixe da divisão semanal de treino', new Date().toISOString()]
    );
  }
  const version21 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 21');
  if (!version21) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [21, 'Prazo da meta corporal no perfil', new Date().toISOString()]
    );
  }
  db.exec(`CREATE TABLE IF NOT EXISTS food_portion_preferences (
    food_id TEXT PRIMARY KEY,
    amount_g REAL NOT NULL CHECK(amount_g BETWEEN 1 AND 5000),
    updated_at TEXT NOT NULL,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
  )`);
  const version22 = db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 22');
  if (!version22) {
    db.execute(
      'INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)',
      [22, 'Porções habituais configuradas por alimento', new Date().toISOString()]
    );
  }
}
