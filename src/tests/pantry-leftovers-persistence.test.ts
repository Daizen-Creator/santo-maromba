import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { FitTrackService } from '../services/fittrack-service';

describe('sobras da despensa e priorização de receitas no SQLite', () => {
  let directory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('migra estoque antigo, preserva quantidades e reabre o marcador de sobra', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-leftovers-'));
    const databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    db.exec(`CREATE TABLE pantry_items (
      id TEXT PRIMARY KEY,
      food_id TEXT NOT NULL,
      amount_available_g REAL NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    db.execute('INSERT INTO pantry_items (id, food_id, amount_available_g, updated_at) VALUES (?, ?, ?, ?)',
      ['legacy-rice', 'food-arroz', 600, '2026-10-20T12:00:00.000Z']);

    await runMigrations(db);
    let service = new FitTrackService(db);
    expect(service.getPantry().find(item => item.foodId === 'food-arroz'))
      .toMatchObject({ amountAvailableG: 600, isLeftover: false });
    expect(db.queryOne<{ version: number }>('SELECT version FROM schema_version WHERE version = 37')?.version).toBe(37);

    service.updatePantryItem('food-arroz', 600, undefined, true);
    expect(service.findRecipesFromPantry({ maxPrepTime: 360 })[0]?.leftoverUseGrams).toBeGreaterThan(0);

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    service = new FitTrackService(db);
    expect(service.getPantry().find(item => item.foodId === 'food-arroz'))
      .toMatchObject({ amountAvailableG: 600, isLeftover: true });
    expect(service.findRecipesFromPantry({ maxPrepTime: 360 })[0]?.leftoverIngredientCount).toBeGreaterThan(0);
  });

  it('aplica restrições alimentares do perfil antes de sugerir receita com estoque suficiente', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-pantry-profile-'));
    db = await createDatabaseDriver(path.join(directory, 'fittrack.db'));
    await runMigrations(db);
    const service = new FitTrackService(db);
    const recipeWithMeat = service.getRecipes().find(recipe => recipe.ingredients.some(ingredient =>
      /frango|patinho|carne bovina|til[aá]pia|atum/i.test(ingredient.foodName)));
    expect(recipeWithMeat).toBeDefined();

    for (const ingredient of recipeWithMeat!.ingredients) {
      service.updatePantryItem(ingredient.foodId, ingredient.amountG);
    }
    expect(service.findRecipesFromPantry({ requireAllIngredients: true }).some(recipe => recipe.id === recipeWithMeat!.id)).toBe(true);

    service.saveProfile({ name: 'Pessoa Teste', birthDate: '1995-04-12', heightCm: 175, dietaryRestrictions: ['vegetariano'] });
    const filtered = service.findRecipesFromPantry({ requireAllIngredients: true });
    expect(filtered.some(recipe => recipe.id === recipeWithMeat!.id)).toBe(false);
  });
});
