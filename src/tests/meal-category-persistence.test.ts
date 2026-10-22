import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { FitTrackService } from '../services/fittrack-service';
import { api } from '../renderer/services/api';
import { DailyMealEntryInputSchema, LoggedMealInputSchema } from '../shared/schema';

describe('Categorias de refeições', () => {
  let directory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('migra registros legados, classifica categorias e preserva novos registros ao reabrir SQLite', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-meal-turn-'));
    const databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    db.exec(`
      CREATE TABLE schema_version (version INTEGER PRIMARY KEY, description TEXT NOT NULL, applied_at TEXT NOT NULL);
      CREATE TABLE logged_meals (
        id TEXT PRIMARY KEY, date TEXT NOT NULL, meal_name TEXT NOT NULL, calories REAL NOT NULL,
        protein_g REAL NOT NULL, carbs_g REAL NOT NULL, fats_g REAL NOT NULL, items_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE daily_meal_entries (
        id TEXT PRIMARY KEY, date TEXT NOT NULL, slot_id TEXT NOT NULL, meal_name TEXT NOT NULL,
        scheduled_time TEXT NOT NULL, recipe_id TEXT,
        status TEXT NOT NULL, items_json TEXT NOT NULL DEFAULT '[]', calories REAL NOT NULL DEFAULT 0,
        protein_g REAL NOT NULL DEFAULT 0, carbs_g REAL NOT NULL DEFAULT 0, fats_g REAL NOT NULL DEFAULT 0,
        note TEXT, completed_at TEXT, updated_at TEXT NOT NULL, UNIQUE(date, slot_id)
      );
      INSERT INTO logged_meals VALUES ('legacy-log', '2026-10-22', 'Café da manhã', 300, 15, 40, 8, '[]', '2026-10-22T07:00:00.000Z');
      INSERT INTO daily_meal_entries VALUES ('legacy-lunch', '2026-10-22', 'lunch', 'Almoço', '13:00', NULL, 'consumed', '[]', 500, 30, 55, 12, NULL, '2026-10-22T13:00:00.000Z', '2026-10-22T13:00:00.000Z');
    `);

    await runMigrations(db);
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 24')?.version).toBe(24);
    expect(db.queryOne<{ meal_turn: string }>('SELECT meal_turn FROM logged_meals WHERE id = ?', ['legacy-log'])?.meal_turn).toBe('breakfast');
    expect(db.queryOne<{ meal_turn: string }>('SELECT meal_turn FROM daily_meal_entries WHERE id = ?', ['legacy-lunch'])?.meal_turn).toBe('lunch');

    let service = new FitTrackService(db);
    service.saveDailyMeal({
      date: '2026-10-22', slotId: 'pre-training-extra', mealName: 'Refeição registrada', mealTurn: 'pre_workout',
      scheduledTime: '17:00', status: 'consumed', items: []
    });
    service.logMeal({ date: '2026-10-22', mealName: 'Pós-treino', mealTurn: 'post_workout', calories: 220, proteinG: 25, carbsG: 20, fatsG: 3 });
    expect(service.getNutritionDistribution('2026-10-22')).toEqual(expect.arrayContaining([
      expect.objectContaining({ mealName: 'Refeição registrada', mealTurn: 'pre_workout', source: 'checklist' }),
      expect.objectContaining({ mealName: 'Pós-treino', mealTurn: 'post_workout', source: 'quick_log' })
    ]));

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db);
    expect(service.getDailyMeals('2026-10-22')).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotId: 'pre-training-extra', mealTurn: 'pre_workout' })
    ]));
    expect(service.getNutritionDistribution('2026-10-22')).toEqual(expect.arrayContaining([
      expect.objectContaining({ mealName: 'Pós-treino', mealTurn: 'post_workout' })
    ]));
  });

  it('mantém categoria escolhida no armazenamento offline da PWA e rejeita categorias inválidas', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value))
    });
    const input = {
      date: '2026-10-22', slotId: 'custom-post-workout', mealName: 'Refeição após treino', mealTurn: 'post_workout' as const,
      scheduledTime: '18:00', status: 'consumed' as const, items: []
    };
    await api.saveDailyMeal(input);
    expect(await api.getDailyMeals(input.date)).toMatchObject([{ mealTurn: 'post_workout' }]);
    expect(await api.getNutritionDistribution(input.date)).toMatchObject([{ mealTurn: 'post_workout', source: 'checklist' }]);

    expect(DailyMealEntryInputSchema.safeParse({ ...input, mealTurn: 'midnight_snack' }).success).toBe(false);
    expect(LoggedMealInputSchema.safeParse({ date: input.date, mealName: 'Ceia', mealTurn: 'supper', calories: 1, proteinG: 1, carbsG: 1, fatsG: 1 }).success).toBe(true);
  });
});
