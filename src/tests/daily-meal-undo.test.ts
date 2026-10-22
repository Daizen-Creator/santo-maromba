import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { FitTrackService } from '../services/fittrack-service';
import { api } from '../renderer/services/api';
import { DailyMealIdentityInputSchema, DailyMealRestoreInputSchema } from '../shared/schema';

const consumedMeal = {
  date: '2026-10-22', slotId: 'lunch', mealName: 'Almoço', mealTurn: 'lunch' as const,
  scheduledTime: '13:00', status: 'consumed' as const,
  items: [{ itemId: 'rice-100', foodId: 'food-arroz', foodName: 'Arroz', plannedAmountG: 100, consumedAmountG: 100,
    calories: 130, proteinG: 2.5, carbsG: 28, fatsG: 0.3 }]
};

describe('Exclusão e restauração de lançamentos alimentares', () => {
  let directory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('exclui e restaura a mesma refeição no SQLite sem alterar macros ou horário registrado', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-meal-undo-'));
    const databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    let service = new FitTrackService(db);
    const original = service.saveDailyMeal(consumedMeal);
    const deleted = service.deleteDailyMeal({ date: original.date, slotId: original.slotId });
    expect(deleted).toEqual(original);
    expect(service.getDailyMeals(original.date)).toEqual([]);

    const restored = service.restoreDailyMeal(deleted);
    expect(restored).toEqual(original);
    expect(() => service.restoreDailyMeal(deleted)).toThrow('Já existe uma refeição neste horário');
    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db);
    expect(service.getDailyMeals(original.date)).toEqual([original]);
  });

  it('permite desfazer no armazenamento offline da PWA e valida a identidade do horário', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value))
    });
    const original = await api.saveDailyMeal(consumedMeal);
    const deleted = await api.deleteDailyMeal({ date: original.date, slotId: original.slotId });
    expect(await api.getDailyMeals(original.date)).toEqual([]);
    expect(await api.restoreDailyMeal(deleted)).toEqual(original);
    await expect(api.restoreDailyMeal(deleted)).rejects.toThrow('Já existe uma refeição neste horário');
    expect(DailyMealIdentityInputSchema.safeParse({ date: original.date, slotId: 'invalid slot' }).success).toBe(false);
    expect(DailyMealRestoreInputSchema.safeParse({ ...original, status: 'ghost' }).success).toBe(false);
  });
});
