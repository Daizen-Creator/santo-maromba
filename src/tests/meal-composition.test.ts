import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { FitTrackService } from '../services/fittrack-service';
import { api } from '../renderer/services/api';
import { createPlannedMealFoodItem, removePlannedMealFoodItem } from '../domain/meal-composition';
import { INITIAL_FOODS } from '../database/seeds/nutrition-seeds';

describe('Edição da composição de uma refeição planejada', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('converte os macros do alimento local para a quantidade escolhida e preserva sua origem', () => {
    const food = INITIAL_FOODS.find(item => item.id === 'food-arroz');
    expect(food).toBeDefined();
    const item = createPlannedMealFoodItem(food!, 250, 'added-rice-1');
    expect(item).toMatchObject({
      itemId: 'added-rice-1', foodId: 'food-arroz', plannedAmountG: 250, consumedAmountG: 0,
      calories: food!.calories * 2.5, proteinG: food!.proteinG * 2.5,
      dataSource: food!.source, dataQuality: food!.dataQuality ?? 'unverified'
    });
    expect(() => createPlannedMealFoodItem(food!, 0)).toThrow('entre 1 g e 5.000 g');
  });

  it('remove um item selecionado e impede salvar uma composição vazia', () => {
    const rice = createPlannedMealFoodItem(INITIAL_FOODS.find(item => item.id === 'food-arroz')!, 100, 'rice');
    const beans = createPlannedMealFoodItem(INITIAL_FOODS.find(item => item.id === 'food-feijao')!, 100, 'beans');
    expect(removePlannedMealFoodItem([rice, beans], 'rice')).toEqual([beans]);
    expect(() => removePlannedMealFoodItem([rice], 'rice')).toThrow('Mantenha pelo menos um ingrediente');
  });

  it('salva a composição alterada e seus macros no SQLite após reabrir', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-meal-composition-'));
    const databasePath = path.join(directory, 'fittrack.db');
    let db: IDatabase | null = null;
    try {
      db = await createDatabaseDriver(databasePath);
      await runMigrations(db);
      const rice = createPlannedMealFoodItem(INITIAL_FOODS.find(item => item.id === 'food-arroz')!, 200, 'rice-200');
      const beans = createPlannedMealFoodItem(INITIAL_FOODS.find(item => item.id === 'food-feijao')!, 100, 'beans-100');
      new FitTrackService(db).saveDailyMeal({
        date: '2026-10-22', slotId: 'lunch', mealName: 'Almoço', mealTurn: 'lunch', scheduledTime: '13:00',
        status: 'pending', items: [rice, beans]
      });
      db.close();
      db = await createDatabaseDriver(databasePath);
      await runMigrations(db);
      const restored = new FitTrackService(db).getDailyMeals('2026-10-22')[0];
      expect(restored).toMatchObject({
        status: 'pending', mealTurn: 'lunch', calories: 0,
        items: [{ itemId: 'rice-200', plannedAmountG: 200 }, { itemId: 'beans-100', plannedAmountG: 100 }]
      });
      expect(restored.items.reduce((total, item) => total + item.calories, 0)).toBe(rice.calories + beans.calories);
    } finally {
      db?.close();
      if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('mantém a composição alterada no armazenamento local offline da PWA', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value))
    });
    const rice = createPlannedMealFoodItem(INITIAL_FOODS.find(item => item.id === 'food-arroz')!, 150, 'rice-150');
    await api.saveDailyMeal({
      date: '2026-10-22', slotId: 'lunch', mealName: 'Almoço', mealTurn: 'lunch', scheduledTime: '13:00',
      status: 'pending', items: [rice]
    });
    expect(await api.getDailyMeals('2026-10-22')).toMatchObject([
      { mealTurn: 'lunch', items: [{ itemId: 'rice-150', plannedAmountG: 150, calories: rice.calories }] }
    ]);
  });
});
