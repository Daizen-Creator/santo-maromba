-- ============================================================================
-- FITTRACK PERSONAL — SCHEMA COMPLETO DO BANCO DE DADOS (SQLITE)
-- Arquitetura relacional, tipos estritos, foreign keys e índices
-- ============================================================================

-- Tabela de Versionamento de Migrações
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

-- 1. Perfil do Usuário
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  height_cm REAL NOT NULL,
  biological_sex TEXT NOT NULL CHECK(biological_sex IN ('male', 'female', 'unspecified')),
  activity_level TEXT NOT NULL CHECK(activity_level IN ('sedentary', 'light', 'moderate', 'heavy', 'extreme')),
  training_experience TEXT NOT NULL CHECK(training_experience IN ('beginner', 'intermediate', 'advanced')),
  fitness_goal TEXT NOT NULL CHECK(fitness_goal IN ('muscle_gain', 'gradual_weight_gain', 'maintenance', 'fat_loss', 'weight_reduction', 'body_recomposition')),
  target_weight_kg REAL,
  target_date TEXT CHECK(target_date IS NULL OR (length(target_date) = 10 AND target_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')),
  dietary_restrictions TEXT, -- JSON Array
  allergies TEXT,            -- JSON Array
  dietary_preferences TEXT,
  food_budget_monthly REAL,
  meals_per_day INTEGER NOT NULL DEFAULT 4 CHECK(meals_per_day BETWEEN 3 AND 6),
  training_days_per_week INTEGER NOT NULL DEFAULT 5 CHECK(training_days_per_week BETWEEN 1 AND 7),
  training_weekdays TEXT, -- JSON Array de dias disponíveis (0=domingo ... 6=sábado)
  work_schedule TEXT,
  study_schedule TEXT,
  sleep_schedule TEXT,
  wake_time TEXT CHECK(wake_time IS NULL OR (wake_time GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(wake_time, 1, 2) BETWEEN '00' AND '23')),
  sleep_time TEXT CHECK(sleep_time IS NULL OR (sleep_time GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(sleep_time, 1, 2) BETWEEN '00' AND '23')),
  training_schedule TEXT,
  available_equipment TEXT,  -- JSON Array
  interruption_history_notes TEXT,
  initial_history_confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_goal_history (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  fitness_goal TEXT NOT NULL CHECK(fitness_goal IN ('muscle_gain', 'gradual_weight_gain', 'maintenance', 'fat_loss', 'weight_reduction', 'body_recomposition')),
  target_weight_kg REAL CHECK(target_weight_kg IS NULL OR target_weight_kg BETWEEN 30 AND 300),
  change_kind TEXT NOT NULL CHECK(change_kind IN ('initial', 'updated')),
  changed_fields TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_profile_goal_history_profile_date ON profile_goal_history(profile_id, changed_at DESC);

-- 2. Histórico de Peso
CREATE TABLE IF NOT EXISTS weight_records (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  weight_kg REAL NOT NULL CHECK(weight_kg > 0),
  notes TEXT,
  source TEXT NOT NULL CHECK(source IN ('verified', 'self_reported')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_weight_records_date ON weight_records(date);
CREATE INDEX IF NOT EXISTS idx_weight_records_profile ON weight_records(profile_id);

-- 3. Histórico de Alterações de Metas
CREATE TABLE IF NOT EXISTS target_change_history (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  date TEXT NOT NULL,
  previous_calories REAL NOT NULL,
  proposed_calories REAL NOT NULL,
  reason TEXT NOT NULL,
  basis_data TEXT NOT NULL, -- JSON com dados utilizados
  status TEXT NOT NULL CHECK(status IN ('accepted', 'rejected', 'edited')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- 4. Medidas Corporais
CREATE TABLE IF NOT EXISTS body_measurements (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  date TEXT NOT NULL,
  height_cm REAL CHECK(height_cm IS NULL OR height_cm BETWEEN 100 AND 250),
  weight_kg REAL,
  waist_circ_cm REAL,
  arm_relaxed_cm REAL,
  arm_flexed_cm REAL,
  chest_cm REAL,
  thigh_cm REAL,
  hip_cm REAL,
  shoulder_circ_cm REAL,
  calf_cm REAL,
  body_fat_pct REAL,
  source TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- 5. Fotos e Metadados do Físico
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  weight_kg_at_photo REAL CHECK(weight_kg_at_photo IS NULL OR weight_kg_at_photo > 0),
  pose TEXT NOT NULL CHECK(pose IN ('front_relaxed', 'front_flexed', 'back', 'side_left', 'side_right', 'custom')),
  custom_pose_name TEXT,
  file_path TEXT NOT NULL,
  lighting_notes TEXT,
  notes TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_photos_date ON photos(date);

-- 6. Alimentos e Base Nutricional
CREATE TABLE IF NOT EXISTS foods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  serving_size_g REAL NOT NULL DEFAULT 100,
  calories REAL NOT NULL,
  protein_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  fats_g REAL NOT NULL,
  fiber_g REAL,
  composition_json TEXT NOT NULL DEFAULT '[]',
  composition_final_weight_g REAL CHECK(composition_final_weight_g IS NULL OR composition_final_weight_g BETWEEN 1 AND 50000),
  is_cooked INTEGER NOT NULL DEFAULT 0, -- 0 = cru, 1 = cozido
  price_estimated REAL,
    substitute_group_id TEXT,
    image_url TEXT,
    image_credit TEXT,
  source TEXT NOT NULL DEFAULT 'Origem não informada',
  data_quality TEXT NOT NULL DEFAULT 'unverified',
  source_reference TEXT,
  source_date TEXT,
  confidence_level TEXT NOT NULL DEFAULT 'unknown',
  is_custom INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 7. Receitas
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('breakfast', 'lunch', 'snack', 'pre_workout', 'post_workout', 'dinner', 'supper')),
  prep_time_minutes INTEGER,
  instructions TEXT NOT NULL,
  servings INTEGER NOT NULL DEFAULT 1 CHECK(servings BETWEEN 1 AND 50),
  final_weight_g REAL CHECK(final_weight_g IS NULL OR final_weight_g BETWEEN 1 AND 50000),
  user_rating INTEGER CHECK(user_rating IS NULL OR user_rating BETWEEN 1 AND 5),
  personal_notes TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    image_credit TEXT,
  budget_swaps TEXT NOT NULL DEFAULT '[]',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_custom INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 8. Ingredientes de Receitas
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  food_id TEXT NOT NULL,
  amount_g REAL NOT NULL,
  is_optional INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE RESTRICT
);

-- 9. Despensa do Usuário
CREATE TABLE IF NOT EXISTS pantry_items (
  id TEXT PRIMARY KEY,
  food_id TEXT NOT NULL,
  amount_available_g REAL NOT NULL,
  unit_price REAL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

-- Quantidades habituais escolhidas pelo usuário; os valores nutricionais dos alimentos seguem por 100 g.
CREATE TABLE IF NOT EXISTS food_portion_preferences (
  food_id TEXT PRIMARY KEY,
  amount_g REAL NOT NULL CHECK(amount_g BETWEEN 1 AND 5000),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

-- 10. Refeições Registradas
CREATE TABLE IF NOT EXISTS logged_meals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  meal_name TEXT NOT NULL,
  meal_turn TEXT NOT NULL DEFAULT 'snack' CHECK(meal_turn IN ('breakfast', 'lunch', 'snack', 'pre_workout', 'post_workout', 'dinner', 'supper')),
  calories REAL NOT NULL,
  protein_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  fats_g REAL NOT NULL,
  items_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_meal_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  meal_name TEXT NOT NULL,
  meal_turn TEXT NOT NULL DEFAULT 'snack' CHECK(meal_turn IN ('breakfast', 'lunch', 'snack', 'pre_workout', 'post_workout', 'dinner', 'supper')),
  scheduled_time TEXT NOT NULL,
  recipe_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'preparing', 'consumed', 'partial', 'deferred', 'skipped', 'cancelled')),
  items_json TEXT NOT NULL DEFAULT '[]',
  calories REAL NOT NULL DEFAULT 0 CHECK(calories >= 0),
  protein_g REAL NOT NULL DEFAULT 0 CHECK(protein_g >= 0),
  carbs_g REAL NOT NULL DEFAULT 0 CHECK(carbs_g >= 0),
  fats_g REAL NOT NULL DEFAULT 0 CHECK(fats_g >= 0),
  note TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(date, slot_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_meals_date ON daily_meal_entries(date, status);

CREATE TABLE IF NOT EXISTS meal_photos (
  id TEXT PRIMARY KEY,
  meal_entry_id TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(date, slot_id)
);
CREATE INDEX IF NOT EXISTS idx_meal_photos_date ON meal_photos(date);

-- 11. Biblioteca de Exercícios
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  primary_muscle TEXT NOT NULL,
  secondary_muscles TEXT, -- JSON Array
  equipment TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  instructions TEXT NOT NULL,
    description TEXT,
    execution_tips TEXT,
    image_url TEXT,
    image_credit TEXT,
    youtube_url TEXT,
  common_errors TEXT,
  alternatives TEXT, -- JSON Array de IDs
  created_at TEXT NOT NULL
);

-- 12. Sessões de Treino Registradas
CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  split_name TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER,
  perceived_exertion INTEGER CHECK(perceived_exertion BETWEEN 1 AND 10),
  notes TEXT,
  created_at TEXT NOT NULL
);

-- 13. Séries e Cargas de Exercícios
CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  reps INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 1,
  rpe REAL CHECK(rpe BETWEEN 1 AND 10),
  rir REAL CHECK(rir BETWEEN 0 AND 10),
  is_pr INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  plans_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workout_templates_updated ON workout_templates(updated_at DESC);

CREATE TABLE IF NOT EXISTS workout_schedule (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK(kind IN ('training', 'rest', 'deload')),
  title TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workout_schedule_date ON workout_schedule(date);

CREATE TABLE IF NOT EXISTS custom_measurement_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  unit TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_measurements (
  id TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL NOT NULL CHECK(value > 0 AND value <= 10000),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(definition_id, date),
  FOREIGN KEY (definition_id) REFERENCES custom_measurement_definitions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_custom_measurements_date ON custom_measurements(date DESC);

CREATE TABLE IF NOT EXISTS exercise_media (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL,
  file_name TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK(mime_type IN ('image/png', 'image/jpeg', 'image/gif', 'video/mp4')),
  original_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exercise_media_exercise ON exercise_media(exercise_id, created_at);

-- 14. Registro de Hidratação
CREATE TABLE IF NOT EXISTS hydration_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL, -- YYYY-MM-DD
  amount_ml INTEGER NOT NULL,
  logged_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hydration_date ON hydration_logs(date);

-- 15. Configurações da Aplicação
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Diário pessoal local por data; conteúdo privado, sem envio para serviços externos.
CREATE TABLE IF NOT EXISTS personal_diary_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  note TEXT NOT NULL CHECK(length(trim(note)) BETWEEN 1 AND 3000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_personal_diary_date ON personal_diary_entries(date DESC);

-- Arquivos importados pelo editor visual ficam no userData; o banco guarda somente metadados.
CREATE TABLE IF NOT EXISTS customization_media (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK(mime_type IN ('image/png', 'image/jpeg', 'image/gif', 'video/mp4')),
  kind TEXT NOT NULL CHECK(kind IN ('background', 'canvas')),
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customization_media_kind ON customization_media(kind, created_at);

-- 16. Projeções físicas salvas pelo usuário (cenários estimados)
CREATE TABLE IF NOT EXISTS physique_projections (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  input_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_physique_projections_profile_created
  ON physique_projections(profile_id, created_at DESC);

-- 17. Modelos reutilizáveis de refeições criados pelo usuário
CREATE TABLE IF NOT EXISTS meal_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  source_date TEXT NOT NULL,
  meals_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meal_templates_updated ON meal_templates(updated_at DESC);
