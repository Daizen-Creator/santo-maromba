import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { DailyLogRepository } from '../database/repositories/daily-log-repository';

describe('Cópia segura de refeições entre dias', () => {
  let tempDirectory: string;
  let db: IDatabase | null = null;

  beforeEach(async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-copy-meals-'));
    db = await createDatabaseDriver(path.join(tempDirectory, 'fittrack.db'));
    await runMigrations(db);
  });

  afterEach(() => {
    db?.close();
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  it('copia refeições como planejadas, ignora slots ocupados e preserva o resultado após reabrir o SQLite', async () => {
    const repository = new DailyLogRepository(db!);
    const food = {
      itemId: 'banana', foodId: 'banana', foodName: 'Banana', plannedAmountG: 100, consumedAmountG: 80,
      calories: 89, proteinG: 1.1, carbsG: 22.8, fatsG: 0.3, dataQuality: 'estimated' as const
    };
    repository.saveMeal({
      date: '2026-10-20', slotId: 'breakfast', mealName: 'Café da manhã', scheduledTime: '08:00',
      recipeId: 'recipe-vitamina', status: 'partial', note: 'nota do dia anterior', items: [food]
    });
    repository.saveMeal({
      date: '2026-10-20', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00',
      status: 'consumed', items: [food]
    });
    repository.saveMeal({
      date: '2026-10-21', slotId: 'lunch', mealName: 'Almoço já existente', scheduledTime: '13:00',
      status: 'consumed', items: [{ ...food, consumedAmountG: 50 }]
    });

    expect(repository.copyMeals({ sourceDate: '2026-10-20', targetDate: '2026-10-21' }))
      .toEqual({ sourceDate: '2026-10-20', targetDate: '2026-10-21', copiedCount: 1, skippedCount: 1 });
    const breakfast = repository.getMeals('2026-10-21').find(meal => meal.slotId === 'breakfast')!;
    expect(breakfast).toMatchObject({ status: 'pending', recipeId: 'recipe-vitamina', calories: 0 });
    expect(breakfast.note).toBeUndefined();
    expect(breakfast.items[0].consumedAmountG).toBe(0);
    expect(repository.getMeals('2026-10-21').find(meal => meal.slotId === 'lunch')?.mealName).toBe('Almoço já existente');

    db!.close();
    db = await createDatabaseDriver(path.join(tempDirectory, 'fittrack.db'));
    await runMigrations(db!);
    const reopened = new DailyLogRepository(db!);
    expect(reopened.getMeals('2026-10-21').find(meal => meal.slotId === 'breakfast')?.items[0].consumedAmountG).toBe(0);
    expect(reopened.copyMeals({ sourceDate: '2026-10-20', targetDate: '2026-10-21' }))
      .toMatchObject({ copiedCount: 0, skippedCount: 2 });
  });
});
