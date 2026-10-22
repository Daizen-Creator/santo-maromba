import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { NutritionRepository } from '../database/repositories/nutrition-repository';
import { INITIAL_FOODS } from '../database/seeds/nutrition-seeds';
import { api } from '../renderer/services/api';

describe('Porções habituais de alimentos', () => {
  let tempDirectory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('migra banco antigo, salva, altera, remove e reabre preferências no SQLite', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-portions-'));
    const databasePath = path.join(tempDirectory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    db.exec('DROP TABLE food_portion_preferences');
    db.execute('DELETE FROM schema_version WHERE version = 22');
    await runMigrations(db);

    let repository = new NutritionRepository(db);
    const foodId = INITIAL_FOODS[0].id;
    expect(repository.saveFoodPortionPreference(foodId, 135)).toMatchObject({ foodId, amountG: 135 });
    expect(repository.getFoodPortionPreferences()).toHaveLength(1);
    repository.saveFoodPortionPreference(foodId, 180);
    expect(repository.getFoodPortionPreferences()).toMatchObject([{ foodId, amountG: 180 }]);
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 22')?.version).toBe(22);

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    repository = new NutritionRepository(db);
    expect(repository.getFoodPortionPreferences()).toMatchObject([{ foodId, amountG: 180 }]);
    expect(repository.saveFoodPortionPreference(foodId, null)).toBeNull();
    expect(repository.getFoodPortionPreferences()).toEqual([]);
    expect(() => repository.saveFoodPortionPreference(foodId, 0)).toThrow('entre 1 e 5.000 g');
    expect(() => repository.saveFoodPortionPreference('missing-food', 100)).toThrow('Alimento não encontrado');
  });

  it('mantém e consulta a porção habitual na PWA offline', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });

    const foodId = INITIAL_FOODS[0].id;
    await api.saveFoodPortionPreference({ foodId, amountG: 125 });
    expect(await api.getFoodPortionPreferences()).toMatchObject([{ foodId, amountG: 125 }]);
    await api.saveFoodPortionPreference({ foodId, amountG: null });
    expect(await api.getFoodPortionPreferences()).toEqual([]);
    await expect(api.saveFoodPortionPreference({ foodId: 'unknown', amountG: 100 })).rejects.toThrow('Alimento não encontrado');
  });
});
