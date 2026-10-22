import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { DailyLogRepository } from '../database/repositories/daily-log-repository';

describe('plano semanal e ordem persistente de refeições', () => {
  let directory: string;
  let db: IDatabase | null = null;
  const databasePath = () => path.join(directory, 'fittrack.db');
  const item = {
    itemId: 'oat-50', foodId: 'oat', foodName: 'Aveia', plannedAmountG: 50, consumedAmountG: 0,
    calories: 190, proteinG: 7, carbsG: 32, fatsG: 4
  };

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-weekly-meals-'));
    db = await createDatabaseDriver(databasePath());
    await runMigrations(db);
  });

  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('aplica um modelo aos sete dias, mantém refeições consumidas e persiste a ordem após reabrir o SQLite', async () => {
    let repository = new DailyLogRepository(db!);
    repository.saveMeal({ date: '2026-10-12', slotId: 'dinner', sortOrder: 0, mealName: 'Jantar', scheduledTime: '20:00', status: 'pending', items: [item] });
    repository.saveMeal({ date: '2026-10-12', slotId: 'breakfast', sortOrder: 1, mealName: 'Café', scheduledTime: '08:00', status: 'pending', items: [item] });
    const template = repository.saveMealTemplate({ name: 'Rotina semanal', sourceDate: '2026-10-12' });
    const originalLunch = repository.saveMeal({
      date: '2026-10-21', slotId: 'breakfast', mealName: 'Café já consumido', scheduledTime: '07:30',
      status: 'consumed', items: [{ ...item, consumedAmountG: 50 }], note: 'registro pessoal'
    });

    const applied = repository.applyMealTemplateToWeek({ templateId: template.id, weekStartDate: '2026-10-19' });
    expect(applied).toMatchObject({ dates: ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'], copiedCount: 13, skippedCount: 1 });
    expect(repository.getMeals('2026-10-21').find(meal => meal.slotId === 'breakfast')).toMatchObject({
      id: originalLunch.id, status: originalLunch.status, note: originalLunch.note,
      calories: originalLunch.calories, items: originalLunch.items
    });
    expect(repository.getMeals('2026-10-21').find(meal => meal.slotId === 'dinner')).toMatchObject({ status: 'pending', calories: 0, items: [{ consumedAmountG: 0 }] });
    expect(repository.reorderMeals({ date: '2026-10-21', slotIds: ['dinner', 'breakfast'] }).map(meal => meal.slotId)).toEqual(['dinner', 'breakfast']);
    expect(() => repository.reorderMeals({ date: '2026-10-21', slotIds: ['dinner'] })).toThrow('A lista mudou');

    db!.close();
    db = await createDatabaseDriver(databasePath());
    await runMigrations(db!);
    repository = new DailyLogRepository(db!);
    expect(repository.getMeals('2026-10-21').map(meal => meal.slotId)).toEqual(['dinner', 'breakfast']);
    expect(repository.getMeals('2026-10-21').map(meal => meal.sortOrder)).toEqual([0, 1]);
    expect(repository.getMeals('2026-10-21').find(meal => meal.slotId === 'breakfast')).toMatchObject({ status: 'consumed', note: 'registro pessoal', calories: 190 });
    expect(repository.applyMealTemplateToWeek({ templateId: template.id, weekStartDate: '2026-10-19' })).toMatchObject({ copiedCount: 0, skippedCount: 14 });
  });

  it('migra uma base anterior preservando os lançamentos e adiciona sort_order', async () => {
    db!.close();
    const schemaPath = path.join(process.cwd(), 'src', 'database', 'schema.sql');
    const oldSchema = fs.readFileSync(schemaPath, 'utf8').replace(/\s*sort_order INTEGER CHECK\(sort_order IS NULL OR sort_order BETWEEN 0 AND 500\),\r?\n/, '\n');
    expect(oldSchema).not.toContain('sort_order INTEGER');
    db = await createDatabaseDriver(databasePath());
    db!.exec(oldSchema);
    db!.execute(`INSERT INTO daily_meal_entries (id, date, slot_id, meal_name, scheduled_time, status, items_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, ['legacy-meal', '2026-10-22', 'lunch', 'Almoço legado', '12:30', 'pending', '[]', '2026-10-22T12:00:00.000Z']);

    await runMigrations(db!);
    const repository = new DailyLogRepository(db!);
    expect(db!.query<{ name: string }>('PRAGMA table_info(daily_meal_entries)').map(column => column.name)).toContain('sort_order');
    expect(repository.getMeals('2026-10-22')).toMatchObject([{ id: 'legacy-meal', mealName: 'Almoço legado', sortOrder: undefined }]);
    expect(db!.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 30')?.version).toBe(30);
  });
});
