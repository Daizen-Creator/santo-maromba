import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { ProfileRepository } from '../database/repositories/profile-repository';
import { FitTrackService } from '../services/fittrack-service';

const localDate = (): string => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};

describe('Registros reais do painel diário', () => {
  let directory: string;
  let dbPath: string;
  let db: IDatabase | null = null;
  let service: FitTrackService;

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-daily-'));
    dbPath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(dbPath);
    await runMigrations(db);
    new ProfileRepository(db).saveProfile({ name: 'Teste', birthDate: '1995-01-01', heightCm: 175, mealsPerDay: 5 });
    service = new FitTrackService(db);
  });

  afterEach(() => {
    db?.close();
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('mantém valores vazios sem registros e relê totais reais após reabrir o SQLite', async () => {
    const initial = service.getDashboardSummary();
    expect(initial.caloriesLogged).toBeNull();
    expect(initial.waterLoggedMl).toBeNull();
    expect(initial.completedMeals).toBeNull();

    service.logMeal({ date: localDate(), mealName: 'Almoço', calories: 620, proteinG: 42, carbsG: 70, fatsG: 16 });
    service.logMeal({ date: localDate(), mealName: 'Lanche', calories: 310, proteinG: 24, carbsG: 36, fatsG: 8 });
    service.logWater({ date: localDate(), amountMl: 500 });
    service.logWater({ date: localDate(), amountMl: 350 });

    const logged = service.getDashboardSummary();
    expect(logged.caloriesLogged).toBe(930);
    expect(logged.proteinLoggedG).toBe(66);
    expect(logged.completedMeals).toBe(2);
    expect(logged.totalPlannedMeals).toBe(5);
    expect(logged.waterLoggedMl).toBe(850);

    db!.close();
    db = null;
    const reopened = await createDatabaseDriver(dbPath);
    db = reopened;
    await runMigrations(reopened);
    service = new FitTrackService(reopened);
    const restored = service.getDashboardSummary();
    expect(restored.caloriesLogged).toBe(930);
    expect(restored.waterLoggedMl).toBe(850);
    expect(restored.completedMeals).toBe(2);
  });

  it('salva o checklist por horário sem duplicar, contabiliza consumo parcial e conserva o estado ao reabrir', async () => {
    const date = localDate();
    const entry = {
      date,
      slotId: 'lunch',
      mealName: 'Almoço',
      scheduledTime: '13:00',
      recipeId: 'recipe-test',
      status: 'partial' as const,
      items: [{
        itemId: 'rice-0', foodId: 'rice', foodName: 'Arroz', plannedAmountG: 100, consumedAmountG: 50,
        calories: 130, proteinG: 2.5, carbsG: 28, fatsG: 0.3
      }]
    };

    const firstSave = service.saveDailyMeal(entry);
    expect(firstSave.calories).toBe(65);
    expect(firstSave.proteinG).toBe(1.25);
    expect(service.getDashboardSummary().caloriesLogged).toBe(65);
    expect(service.getDashboardSummary().completedMeals).toBe(1);

    const revised = service.saveDailyMeal({ ...entry, status: 'consumed', items: [{ ...entry.items[0], consumedAmountG: 120 }] });
    expect(revised.id).toBe(firstSave.id);
    expect(service.getDailyMeals(date)).toHaveLength(1);
    expect(service.getDashboardSummary().caloriesLogged).toBe(156);

    db!.close();
    db = null;
    const reopened = await createDatabaseDriver(dbPath);
    db = reopened;
    await runMigrations(reopened);
    service = new FitTrackService(reopened);

    expect(service.getDailyMeals(date)[0].status).toBe('consumed');
    expect(service.getDailyMeals(date)[0].items[0].consumedAmountG).toBe(120);
    expect(service.getDashboardSummary().caloriesLogged).toBe(156);

    service.saveDailyMeal({ ...entry, status: 'skipped', items: [{ ...entry.items[0], consumedAmountG: 0 }] });
    expect(service.getDashboardSummary().caloriesLogged).toBeNull();
    expect(service.getDashboardSummary().completedMeals).toBeNull();

    const duplicateIngredientEntry = service.saveDailyMeal({
      ...entry,
      slotId: 'breakfast',
      mealName: 'Café da manhã',
      scheduledTime: '07:30',
      status: 'partial',
      items: [
        { ...entry.items[0], itemId: 'rice-0', consumedAmountG: 50 },
        { ...entry.items[0], itemId: 'rice-1', plannedAmountG: 50, consumedAmountG: 50 }
      ]
    });
    expect(duplicateIngredientEntry.items).toHaveLength(2);
    expect(duplicateIngredientEntry.calories).toBe(195);
  });
});
