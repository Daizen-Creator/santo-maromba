import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { DailyLogRepository } from '../database/repositories/daily-log-repository';

describe('Modelos reutilizáveis de refeições', () => {
  let directory: string;
  let db: IDatabase | null = null;

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-meal-template-'));
    db = await createDatabaseDriver(path.join(directory, 'fittrack.db'));
    await runMigrations(db);
  });

  afterEach(() => {
    db?.close();
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('salva, reabre e aplica o plano como pendente preservando horários já preenchidos', async () => {
    const repo = new DailyLogRepository(db!);
    const item = {
      itemId: 'rice-1', foodId: 'rice', foodName: 'Arroz', plannedAmountG: 120, consumedAmountG: 100,
      calories: 156, proteinG: 3, carbsG: 34, fatsG: 0.4, dataQuality: 'estimated' as const
    };
    repo.saveMeal({ date: '2026-10-20', slotId: 'breakfast', mealName: 'Café da manhã', scheduledTime: '08:00', status: 'consumed', items: [item] });
    repo.saveMeal({ date: '2026-10-20', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:30', status: 'pending', items: [item] });

    const saved = repo.saveMealTemplate({ name: 'Dia de treino', sourceDate: '2026-10-20' });
    expect(saved.meals).toHaveLength(2);
    expect(saved.meals[0].items[0].consumedAmountG).toBe(0);

    db!.close();
    db = await createDatabaseDriver(path.join(directory, 'fittrack.db'));
    await runMigrations(db!);
    const reopened = new DailyLogRepository(db!);
    expect(reopened.getMealTemplates()).toMatchObject([{ id: saved.id, name: 'Dia de treino', sourceDate: '2026-10-20' }]);
    reopened.saveMeal({ date: '2026-10-21', slotId: 'lunch', mealName: 'Almoço já preenchido', scheduledTime: '13:00', status: 'consumed', items: [item] });

    expect(reopened.applyMealTemplate({ templateId: saved.id, targetDate: '2026-10-21' })).toMatchObject({ copiedCount: 1, skippedCount: 1 });
    const target = reopened.getMeals('2026-10-21');
    expect(target.find(meal => meal.slotId === 'breakfast')).toMatchObject({ status: 'pending', calories: 0, items: [{ consumedAmountG: 0 }] });
    expect(target.find(meal => meal.slotId === 'lunch')?.mealName).toBe('Almoço já preenchido');
    expect(() => reopened.saveMealTemplate({ name: 'dia de treino', sourceDate: '2026-10-20' })).toThrow('Já existe um modelo com esse nome.');
  });

  it('rejeita salvar modelo sem refeições na data de origem', () => {
    const repo = new DailyLogRepository(db!);
    expect(() => repo.saveMealTemplate({ name: 'Dia vazio', sourceDate: '2026-10-20' })).toThrow('Não há refeições salvas');
  });
});
