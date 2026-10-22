import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { DailyLogRepository } from '../database/repositories/daily-log-repository';
import { NutritionRepository } from '../database/repositories/nutrition-repository';
import { ShoppingListRepository } from '../database/repositories/shopping-list-repository';

describe('lista de compras SQLite', () => {
  let directory: string;
  let db: IDatabase | null = null;
  let dailyLogs: DailyLogRepository;
  let nutrition: NutritionRepository;
  let shopping: ShoppingListRepository;
  const databasePath = () => path.join(directory, 'fittrack.db');
  const rice = (plannedAmountG: number, consumedAmountG = 0) => ({
    itemId: 'rice-item', foodId: 'food-arroz', foodName: 'Arroz', plannedAmountG, consumedAmountG,
    calories: 130, proteinG: 2, carbsG: 28, fatsG: 0.3
  });

  const createRepositories = () => {
    nutrition = new NutritionRepository(db!);
    dailyLogs = new DailyLogRepository(db!);
    shopping = new ShoppingListRepository(db!, dailyLogs, () => nutrition.getFoods());
  };

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-shopping-list-'));
    db = await createDatabaseDriver(databasePath());
    await runMigrations(db);
    createRepositories();
  });

  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('soma quantidades, mantém compras feitas, recalcula mudanças e reabre a lista persistida', async () => {
    dailyLogs.saveMeal({
      date: '2026-10-19', slotId: 'breakfast', mealName: 'Café', scheduledTime: '08:00', status: 'pending', items: [rice(100)]
    });
    dailyLogs.saveMeal({
      date: '2026-10-20', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00', status: 'partial',
      items: [rice(100, 40), { ...rice(50, 20), itemId: 'egg-item', foodId: 'food-ovo', foodName: 'Ovo' }]
    });
    dailyLogs.saveMeal({
      date: '2026-10-21', slotId: 'dinner', mealName: 'Jantar', scheduledTime: '19:00', status: 'consumed', items: [rice(300, 300)]
    });

    let items = shopping.generate('2026-10-22');
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ weekStartDate: '2026-10-19', foodId: 'food-ovo', amountG: 30, category: 'protein', purchased: false }),
      expect.objectContaining({ weekStartDate: '2026-10-19', foodId: 'food-arroz', amountG: 160, category: 'carb', purchased: false })
    ]));
    items = shopping.setPurchased({ weekStartDate: '2026-10-19', foodId: 'food-arroz', purchased: true });
    expect(items.find(item => item.foodId === 'food-arroz')?.purchased).toBe(true);
    expect(shopping.generate('2026-10-19').find(item => item.foodId === 'food-arroz')?.purchased).toBe(true);

    dailyLogs.saveMeal({
      date: '2026-10-20', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00', status: 'partial', items: [rice(120, 40)]
    });
    expect(shopping.generate('2026-10-19').find(item => item.foodId === 'food-arroz')).toMatchObject({ amountG: 180, purchased: false });
    expect(() => shopping.setPurchased({ weekStartDate: '2026-10-19', foodId: 'missing-food', purchased: true })).toThrow('não pertence');

    db!.close();
    db = await createDatabaseDriver(databasePath());
    await runMigrations(db!);
    createRepositories();
    expect(shopping.getByWeek('2026-10-22').find(item => item.foodId === 'food-arroz')).toMatchObject({ amountG: 180, purchased: false });
    expect(db!.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 31')?.version).toBe(31);
  });
});
