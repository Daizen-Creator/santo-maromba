import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { DailyLogRepository } from '../database/repositories/daily-log-repository';

describe('Alimentos recentes na persistência SQLite', () => {
  let tempDirectory: string;
  let db: IDatabase | null = null;

  beforeEach(async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-recent-food-'));
    db = await createDatabaseDriver(path.join(tempDirectory, 'fittrack.db'));
    await runMigrations(db);
  });

  afterEach(() => {
    db?.close();
    if (tempDirectory && fs.existsSync(tempDirectory)) fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  it('consulta apenas quantidades realmente consumidas e mantém o histórico após reabrir o banco', async () => {
    const logs = new DailyLogRepository(db!);
    logs.saveMeal({
      date: '2026-10-20', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00', status: 'partial',
      items: [{
        itemId: 'rice', foodId: 'rice', foodName: 'Arroz', plannedAmountG: 100, consumedAmountG: 45,
        calories: 130, proteinG: 2.5, carbsG: 28, fatsG: 0.3, dataQuality: 'estimated', dataSource: 'Fonte do teste'
      }]
    });
    logs.saveMeal({
      date: '2026-10-21', slotId: 'dinner', mealName: 'Jantar', scheduledTime: '19:00', status: 'pending',
      items: [{
        itemId: 'beans', foodId: 'beans', foodName: 'Feijão', plannedAmountG: 100, consumedAmountG: 0,
        calories: 90, proteinG: 6, carbsG: 16, fatsG: 1
      }]
    });
    expect(logs.getRecentlyUsedFoods()).toMatchObject([{ foodId: 'rice', lastAmountG: 45, dataSource: 'Fonte do teste' }]);

    db!.close();
    db = await createDatabaseDriver(path.join(tempDirectory, 'fittrack.db'));
    await runMigrations(db!);
    expect(new DailyLogRepository(db!).getRecentlyUsedFoods()).toMatchObject([
      { foodId: 'rice', foodName: 'Arroz', lastUsedDate: '2026-10-20', lastAmountG: 45, useCount: 1 }
    ]);
  });
});
