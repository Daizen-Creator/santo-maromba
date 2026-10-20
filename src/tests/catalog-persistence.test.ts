import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { NutritionRepository } from '../database/repositories/nutrition-repository';
import { WorkoutRepository } from '../database/repositories/workout-repository';
import { INITIAL_FOODS, INITIAL_RECIPES } from '../database/seeds/nutrition-seeds';
import { INITIAL_EXERCISES } from '../database/seeds/exercise-seeds';

describe('Catálogos locais de alimentação e treino', () => {
  let tempDirectory: string;
  let db: IDatabase | null = null;

  beforeEach(async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-catalog-'));
    db = await createDatabaseDriver(path.join(tempDirectory, 'fittrack.db'));
    await runMigrations(db);
  });

  afterEach(() => {
    db?.close();
    if (tempDirectory && fs.existsSync(tempDirectory)) {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it('gera 200 receitas completas com opções de economia e alimentos válidos', () => {
    const foodIds = new Set(INITIAL_FOODS.map(food => food.id));
    const recipeIds = new Set(INITIAL_RECIPES.map(recipe => recipe.id));
    const recipeNames = new Set(INITIAL_RECIPES.map(recipe => recipe.name));

    expect(INITIAL_FOODS.length + INITIAL_RECIPES.length).toBeGreaterThanOrEqual(200);
    expect(INITIAL_FOODS.every(food => food.servingSizeG === 100 && food.substituteGroupId && food.imageUrl)).toBe(true);
    expect(INITIAL_RECIPES).toHaveLength(200);
    expect(INITIAL_RECIPES.every(recipe => !/[\u00c3\u00c2\u0080-\u009f\ufffd]/.test(`${recipe.name} ${recipe.instructions} ${(recipe.budgetSwaps || []).join(' ')}`))).toBe(true);
    expect(INITIAL_RECIPES.some(recipe => recipe.name.includes('Pão'))).toBe(true);
    expect(recipeIds.size).toBe(200);
    expect(recipeNames.size).toBe(200);
    expect(INITIAL_RECIPES.every(recipe => recipe.ingredients.length > 0)).toBe(true);
    expect(INITIAL_RECIPES.every(recipe => recipe.budgetSwaps && recipe.budgetSwaps.length > 0)).toBe(true);
    expect(INITIAL_RECIPES.every(recipe => recipe.imageUrl && recipe.instructions.includes('\n'))).toBe(true);
    expect(INITIAL_RECIPES.every(recipe => recipe.ingredients.every(item => foodIds.has(item.foodId)))).toBe(true);
    expect(new Set(INITIAL_RECIPES.map(recipe => recipe.category))).toEqual(
      new Set(['breakfast', 'lunch', 'snack', 'pre_workout', 'post_workout', 'dinner', 'supper'])
    );
  });

  it('sincroniza receitas e exercícios no SQLite sem apagar favoritos ou treinos registrados', () => {
    db!.execute(
      `INSERT INTO recipes (id, name, category, instructions, is_favorite, is_custom, created_at)
       VALUES (?, ?, ?, ?, 1, 0, ?)`,
      ['recipe-1', 'Favorita anterior', 'breakfast', 'Preparo já salvo', new Date().toISOString()]
    );
    db!.execute(
      `INSERT INTO workout_sessions (id, date, split_name, completed, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      ['session-before-catalog', '2026-10-19', 'Treino anterior', 1, new Date().toISOString()]
    );

    const nutrition = new NutritionRepository(db!);
    const workout = new WorkoutRepository(db!);
    const recipes = nutrition.getRecipes();
    const exercises = workout.getExercises();

    expect(recipes).toHaveLength(200);
    expect(db!.queryOne<{ value: string }>('SELECT value FROM app_metadata WHERE key = ?', ['nutrition_catalog_version'])?.value).toBe('4');
    expect(db!.queryOne<{ value: string }>('SELECT value FROM app_metadata WHERE key = ?', ['exercise_catalog_version'])?.value).toBe('3');
    expect(recipes.every(recipe => !/[\u00c3\u00c2\u0080-\u009f\ufffd]/.test(`${recipe.name} ${recipe.instructions} ${(recipe.budgetSwaps || []).join(' ')}`))).toBe(true);
    expect(recipes.find(recipe => recipe.id === 'recipe-1')?.isFavorite).toBe(true);
    expect(recipes.every(recipe => recipe.ingredients.length > 0)).toBe(true);
    expect(INITIAL_EXERCISES.length).toBeGreaterThanOrEqual(100);
    expect(INITIAL_EXERCISES.every(exercise => exercise.imageUrl && exercise.youtubeUrl && exercise.executionTips)).toBe(true);
    expect(new Set(exercises.map(exercise => exercise.id)).size).toBe(exercises.length);
    expect(exercises.every(exercise => exercise.instructions.length > 20)).toBe(true);
    expect(workout.getSessions().some(session => session.id === 'session-before-catalog')).toBe(true);

    new NutritionRepository(db!);
    new WorkoutRepository(db!);
    expect(db!.queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM recipes')?.total).toBe(200);
    expect(db!.queryOne<{ total: number }>('SELECT COUNT(*) AS total FROM exercises')?.total)
      .toBe(exercises.length);
  });

  it('migra tabelas antigas de alimentos e receitas sem perder dados nem falhar no índice de substituição', async () => {
    const oldDbPath = path.join(tempDirectory, 'old-fittrack.db');
    const oldDb = await createDatabaseDriver(oldDbPath);
    try {
      oldDb.exec(`CREATE TABLE recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        prep_time_minutes INTEGER,
        instructions TEXT NOT NULL,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        is_custom INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`);
      oldDb.exec(`CREATE TABLE foods (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL
      )`);
      oldDb.execute('INSERT INTO foods (id, name, category) VALUES (?, ?, ?)', ['food-legacy', 'Arroz antigo', 'grain']);

      await runMigrations(oldDb);
      expect(oldDb.query<{ name: string }>('PRAGMA table_info(recipes)')
        .some(column => column.name === 'budget_swaps')).toBe(true);
      const foodColumns = oldDb.query<{ name: string }>('PRAGMA table_info(foods)').map(column => column.name);
      expect(foodColumns).toContain('substitute_group_id');
      expect(foodColumns).toContain('image_url');
      expect(oldDb.queryOne<{ name: string }>('SELECT name FROM foods WHERE id = ?', ['food-legacy'])?.name)
        .toBe('Arroz antigo');
      expect(oldDb.queryOne<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_foods_substitute_group'"
      )?.name).toBe('idx_foods_substitute_group');
      expect(oldDb.queryOne('SELECT value FROM app_metadata WHERE key = ?', ['nutrition_catalog_version']))
        .toBeUndefined();
    } finally {
      oldDb.close();
    }
  });
});
