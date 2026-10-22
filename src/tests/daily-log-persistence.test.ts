import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { ProfileRepository } from '../database/repositories/profile-repository';
import { FitTrackService } from '../services/fittrack-service';
import { calculateLeftoverAmount } from '../domain/meal-leftovers';
import { buildSupplementMealInput, getSupplementHistory } from '../domain/supplement-intake';

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
    const nutritionHistory = service.getNutritionAnalytics({ fromDate: localDate(), toDate: localDate() });
    expect(nutritionHistory).toMatchObject({
      trackedDays: 1,
      averages: { calories: 930, proteinG: 66, carbsG: 106, fatsG: 24 }
    });

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
    expect(service.getNutritionAnalytics({ fromDate: localDate(), toDate: localDate() }).averages?.calories).toBe(930);
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

  it('registra a dose de suplemento com macros identificados e recupera o histórico após reabrir SQLite', async () => {
    const date = localDate();
    const whey = service.getFoods().find(food => food.id === 'food-whey')!;
    const input = buildSupplementMealInput({
      food: whey, date, scheduledTime: '07:15', amountG: 30, slotId: `supplement-${date}-test`
    });
    const saved = service.saveDailyMeal(input);
    expect(saved).toMatchObject({ status: 'consumed', calories: 120, proteinG: 24 });

    db!.close();
    db = null;
    const reopened = await createDatabaseDriver(dbPath);
    db = reopened;
    await runMigrations(reopened);
    service = new FitTrackService(reopened);

    const restored = service.getDailyMeals(date).find(entry => entry.id === saved.id)!;
    expect(restored.items[0]).toMatchObject({ foodId: 'food-whey', plannedAmountG: 30, consumedAmountG: 30, calories: 120 });
    expect(getSupplementHistory([restored], service.getFoods())).toMatchObject([
      { date, scheduledTime: '07:15', foodId: 'food-whey', amountG: 30, calories: 120, proteinG: 24 }
    ]);
    expect(service.getDashboardSummary().caloriesLogged).toBe(120);
  });

  it('persiste as quantidades planejadas e consumidas para consultar sobras após reabrir', async () => {
    const date = localDate();
    service.saveDailyMeal({
      date, slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:30', status: 'partial',
      items: [{ itemId: 'rice-0', foodId: 'rice', foodName: 'Arroz', plannedAmountG: 180, consumedAmountG: 135,
        calories: 360, proteinG: 7, carbsG: 80, fatsG: 1 }]
    });
    expect(service.getDailyMeals(date)[0].calories).toBe(270);

    db!.close();
    db = null;
    const reopened = await createDatabaseDriver(dbPath);
    db = reopened;
    await runMigrations(reopened);
    service = new FitTrackService(reopened);
    const item = service.getDailyMeals(date)[0].items[0];
    expect(item.consumedAmountG).toBe(135);
    expect(calculateLeftoverAmount(item.plannedAmountG, item.consumedAmountG)).toBe(45);
  });

  it('persiste a porção planejada recalculada sem alterar consumo real nem o horário registrado', async () => {
    const date = localDate();
    const initial = service.saveDailyMeal({
      date, slotId: 'breakfast', mealName: 'Café da manhã', scheduledTime: '07:30', status: 'partial',
      items: [{ itemId: 'oat-0', foodId: 'oat', foodName: 'Aveia', plannedAmountG: 100, consumedAmountG: 40,
        calories: 300, proteinG: 12, carbsG: 50, fatsG: 6 }]
    });
    const updated = service.saveDailyMeal({
      date, slotId: 'breakfast', mealName: 'Café da manhã', scheduledTime: '07:30', status: 'partial',
      items: [{ itemId: 'oat-0', foodId: 'oat', foodName: 'Aveia', plannedAmountG: 150, consumedAmountG: 40,
        calories: 450, proteinG: 18, carbsG: 75, fatsG: 9 }]
    });
    expect(updated.items[0].plannedAmountG).toBe(150);
    expect(updated.items[0].consumedAmountG).toBe(40);
    expect(updated.calories).toBe(120);
    expect(updated.completedAt).toBe(initial.completedAt);

    db!.close();
    db = null;
    const reopened = await createDatabaseDriver(dbPath);
    db = reopened;
    await runMigrations(reopened);
    service = new FitTrackService(reopened);
    expect(service.getDailyMeals(date)[0]).toMatchObject({
      completedAt: initial.completedAt,
      calories: 120,
      items: [{ plannedAmountG: 150, consumedAmountG: 40, calories: 450 }]
    });
  });

  it('consulta a distribuição real do dia após reabrir o SQLite e exclui refeições pendentes', async () => {
    const date = localDate();
    service.logMeal({ date, mealName: 'Lanche rápido', calories: 220, proteinG: 12, carbsG: 24, fatsG: 7 });
    const item = { itemId: 'rice-0', foodId: 'rice', foodName: 'Arroz', plannedAmountG: 100, consumedAmountG: 50,
      calories: 260, proteinG: 5, carbsG: 56, fatsG: 0.6 };
    service.saveDailyMeal({ date, slotId: 'lunch', mealName: 'Almoço', scheduledTime: '13:00', status: 'partial', items: [item] });
    service.saveDailyMeal({ date, slotId: 'dinner', mealName: 'Jantar planejado', scheduledTime: '20:00', status: 'pending', items: [item] });
    expect(service.getNutritionDistribution(date)).toHaveLength(2);

    db!.close();
    db = null;
    const reopened = await createDatabaseDriver(dbPath);
    db = reopened;
    await runMigrations(reopened);
    service = new FitTrackService(reopened);
    const distribution = service.getNutritionDistribution(date);
    expect(distribution).toHaveLength(2);
    expect(distribution).toEqual(expect.arrayContaining([
      expect.objectContaining({ mealName: 'Lanche rápido', source: 'quick_log', calories: 220 }),
      expect.objectContaining({ mealName: 'Almoço', source: 'checklist', calories: 130 })
    ]));
  });
});
