import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { FitTrackService } from '../services/fittrack-service';

describe('estoque e consumo confirmado no SQLite', () => {
  let directory = '';
  let db: IDatabase | null = null;
  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('desconta cada alimento uma vez, reabre o histórico e estorna exclusão/restauração sem saldo negativo', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-pantry-'));
    const databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    let service = new FitTrackService(db);
    const rice = service.getFoods().find(food => food.id === 'food-arroz')!;
    service.updatePantryItem(rice.id, 500, '2026-11-02');
    const meal = {
      date: '2026-10-22', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00', status: 'consumed' as const,
      items: [{ itemId: 'rice-1', foodId: rice.id, foodName: rice.name, plannedAmountG: 200, consumedAmountG: 200,
        calories: rice.calories * 2, proteinG: rice.proteinG * 2, carbsG: rice.carbsG * 2, fatsG: rice.fatsG * 2 }]
    };

    service.saveDailyMeal(meal);
    service.saveDailyMeal(meal);
    expect(service.getPantry().find(item => item.foodId === rice.id)?.amountAvailableG).toBe(300);
    expect(db.queryOne<any>('SELECT consumed_g, deducted_g FROM pantry_consumption WHERE date = ? AND slot_id = ? AND food_id = ?', [meal.date, meal.slotId, rice.id])).toMatchObject({ consumed_g: 200, deducted_g: 200 });

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db);
    expect(service.getPantry().find(item => item.foodId === rice.id)?.amountAvailableG).toBe(300);
    expect(service.getPantry().find(item => item.foodId === rice.id)?.expiresAt).toBe('2026-11-02');
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 32')?.version).toBe(32);
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 33')?.version).toBe(33);

    const deleted = service.deleteDailyMeal({ date: meal.date, slotId: meal.slotId });
    expect(service.getPantry().find(item => item.foodId === rice.id)?.amountAvailableG).toBe(500);
    service.restoreDailyMeal(deleted);
    expect(service.getPantry().find(item => item.foodId === rice.id)?.amountAvailableG).toBe(300);

    service.updatePantryItem(rice.id, 250);
    service.saveDailyMeal({ ...meal, status: 'pending', items: [{ ...meal.items[0], consumedAmountG: 0 }] });
    expect(service.getPantry().find(item => item.foodId === rice.id)?.amountAvailableG).toBe(250);
  });

  it('migra refeições consumidas antigas como histórico sem descontar o estoque retroativamente', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-pantry-legacy-'));
    const databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    let service = new FitTrackService(db);
    const rice = service.getFoods().find(food => food.id === 'food-arroz')!;
    const meal = {
      date: '2026-10-22', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00', status: 'consumed' as const,
      items: [{ itemId: 'rice-1', foodId: rice.id, foodName: rice.name, plannedAmountG: 200, consumedAmountG: 200,
        calories: rice.calories * 2, proteinG: rice.proteinG * 2, carbsG: rice.carbsG * 2, fatsG: rice.fatsG * 2 }]
    };
    service.saveDailyMeal(meal);
    db.execute('DELETE FROM pantry_consumption');
    db.execute('DELETE FROM schema_version WHERE version = 32');
    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db);
    expect(db.queryOne<any>('SELECT consumed_g, deducted_g FROM pantry_consumption WHERE date = ? AND slot_id = ? AND food_id = ?', [meal.date, meal.slotId, rice.id])).toMatchObject({ consumed_g: 200, deducted_g: 0 });
    service.updatePantryItem(rice.id, 500);
    service.saveDailyMeal(meal);
    expect(service.getPantry().find(item => item.foodId === rice.id)?.amountAvailableG).toBe(500);
  });

  it('salva preço por kg, origem e data sem alterar saldo e recupera após reabrir o SQLite', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-pantry-price-'));
    const databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    let service = new FitTrackService(db);
    const rice = service.getFoods().find(food => food.id === 'food-arroz')!;
    service.updatePantryItem(rice.id, 350);
    service.updatePantryPrice(rice.id, 25.5, 'Mercado do bairro');
    expect(service.getPantry().find(item => item.foodId === rice.id)).toMatchObject({ amountAvailableG: 350, unitPrice: 25.5, priceSource: 'Mercado do bairro' });
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 34')?.version).toBe(34);

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db);
    expect(service.getPantry().find(item => item.foodId === rice.id)).toMatchObject({ amountAvailableG: 350, unitPrice: 25.5, priceSource: 'Mercado do bairro' });
    expect(service.getPantry().find(item => item.foodId === rice.id)?.priceUpdatedAt).toBeTruthy();

    service.updatePantryPrice(rice.id, null, null);
    expect(service.getPantry().find(item => item.foodId === rice.id)).toMatchObject({ amountAvailableG: 350 });
    expect(service.getPantry().find(item => item.foodId === rice.id)?.unitPrice).toBeUndefined();
  });

  it('usa preços locais para calcular custo da receita e mantém a origem após reabrir', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-recipe-cost-'));
    const databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    let service = new FitTrackService(db);
    const foodIds = new Set(service.getFoods().map(food => food.id));
    const recipe = service.getRecipes().find(item => item.ingredients.length > 0 && item.ingredients.every(ingredient => foodIds.has(ingredient.foodId)))!;
    const priceByFood = new Map<string, number>();
    recipe.ingredients.forEach((ingredient, index) => {
      const price = 12 + index;
      priceByFood.set(ingredient.foodId, price);
      service.updatePantryPrice(ingredient.foodId, price, 'Pesquisa manual');
    });
    const expectedCost = Number(recipe.ingredients.reduce((sum, ingredient) => sum + priceByFood.get(ingredient.foodId)! * ingredient.amountG / 1000, 0).toFixed(2));
    expect(service.getRecipes().find(item => item.id === recipe.id)).toMatchObject({ estimatedCost: expectedCost, costSource: 'user_prices' });

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db);
    expect(service.getRecipes().find(item => item.id === recipe.id)).toMatchObject({ estimatedCost: expectedCost, costSource: 'user_prices' });
  });
});
