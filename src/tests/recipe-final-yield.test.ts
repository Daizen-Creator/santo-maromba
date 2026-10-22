import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { NutritionRepository } from '../database/repositories/nutrition-repository';
import { getRecipeNutritionPer100g, normalizeRecipeFinalWeight } from '../domain/recipe-portions';
import { INITIAL_RECIPES } from '../database/seeds/nutrition-seeds';
import { api } from '../renderer/services/api';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: key => { values.delete(key); },
    clear: () => values.clear(),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  } as Storage;
}

describe('Peso final e informação nutricional por 100 g da receita', () => {
  let directory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('calcula por 100 g somente quando o peso pronto foi medido', () => {
    const recipe = {
      ...INITIAL_RECIPES[0], finalWeightG: 250,
      totalCalories: 500, totalProteinG: 30, totalCarbsG: 80, totalFatsG: 10
    };
    expect(getRecipeNutritionPer100g(recipe)).toEqual({ calories: 200, proteinG: 12, carbsG: 32, fatsG: 4 });
    expect(getRecipeNutritionPer100g({ ...recipe, finalWeightG: undefined })).toBeNull();
    expect(normalizeRecipeFinalWeight(250.26)).toBe(250.3);
    expect(() => normalizeRecipeFinalWeight(0)).toThrow('entre 1 g e 50.000 g');
    expect(() => normalizeRecipeFinalWeight(50001)).toThrow('entre 1 g e 50.000 g');
  });

  it('salva, remove e recupera o rendimento preparado depois de reabrir o SQLite', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-recipe-yield-'));
    const databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    const repository = new NutritionRepository(db);
    const recipe = repository.getRecipes()[0];

    expect(repository.setRecipeFinalWeight(recipe.id, 315.5).finalWeightG).toBe(315.5);
    expect(() => repository.setRecipeFinalWeight(recipe.id, 0)).toThrow('entre 1 g e 50.000 g');
    expect(() => repository.setRecipeFinalWeight('receita-inexistente', 300)).toThrow('Receita não encontrada.');

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    const reopened = new NutritionRepository(db).getRecipes().find(item => item.id === recipe.id)!;
    expect(reopened.finalWeightG).toBe(315.5);
    expect(getRecipeNutritionPer100g(reopened)).not.toBeNull();
    expect(new NutritionRepository(db).setRecipeFinalWeight(recipe.id, null).finalWeightG).toBeUndefined();
  });

  it('persiste o peso final e os mesmos macros na PWA offline', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const recipe = (await api.getRecipes())[0];
    await api.setRecipeFinalWeight(recipe.id, 278.5);
    expect((await api.getRecipes()).find(item => item.id === recipe.id)?.finalWeightG).toBe(278.5);
    expect(getRecipeNutritionPer100g((await api.getRecipes()).find(item => item.id === recipe.id)!)).not.toBeNull();
    await api.setRecipeFinalWeight(recipe.id, null);
    expect((await api.getRecipes()).find(item => item.id === recipe.id)?.finalWeightG).toBeUndefined();
    await expect(api.setRecipeFinalWeight(recipe.id, 50001)).rejects.toThrow('entre 1 g e 50.000 g');
  });
});
