import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateCustomFoodComposition, calculateCustomFoodInput } from '../domain/custom-food-composition';
import { createDatabaseDriver, IDatabase } from '../database/driver';
import { runMigrations } from '../database/migrations';
import { NutritionRepository } from '../database/repositories/nutrition-repository';
import { api } from '../renderer/services/api';
import { FoodItem } from '../shared/types';

const rice: FoodItem = {
  id: 'rice', name: 'Arroz', category: 'carb', servingSizeG: 100, calories: 130,
  proteinG: 2.5, carbsG: 28, fatsG: 0.3, fiberG: 0.4, isCooked: true,
  source: 'Teste', dataQuality: 'verified'
};
const beans: FoodItem = {
  id: 'beans', name: 'Feijão', category: 'legume', servingSizeG: 100, calories: 76,
  proteinG: 4.8, carbsG: 13.6, fatsG: 0.5, isCooked: true,
  source: 'Teste', dataQuality: 'verified'
};

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

describe('Alimentos caseiros calculados pela composição', () => {
  let directory = '';
  let db: IDatabase | null = null;

  afterEach(() => {
    db?.close();
    db = null;
    if (directory && fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
    vi.unstubAllGlobals();
  });

  it('calcula macros por 100 g com peso final e preserva fibras desconhecidas', () => {
    expect(calculateCustomFoodComposition([
      { foodId: rice.id, amountG: 100 }, { foodId: beans.id, amountG: 100 }
    ], [rice, beans], 150)).toEqual({
      calories: 137.33, proteinG: 4.87, carbsG: 27.73, fatsG: 0.53,
      fiberG: undefined, ingredientWeightG: 200, finalWeightG: 150
    });
  });

  it('rejeita ingrediente ausente, duplicado e inclusão do próprio alimento', () => {
    expect(() => calculateCustomFoodComposition([{ foodId: 'missing', amountG: 50 }], [rice])).toThrow('não existe no catálogo');
    expect(() => calculateCustomFoodComposition([{ foodId: 'rice', amountG: 50 }, { foodId: 'rice', amountG: 20 }], [rice])).toThrow('única vez');
    expect(() => calculateCustomFoodInput({ name: 'Arroz caseiro', category: 'carb', calories: 1, proteinG: 1, carbsG: 1, fatsG: 1,
      ingredients: [{ foodId: 'custom-food-a', amountG: 100 }] }, [rice], 'custom-food-a')).toThrow('não pode incluir a si mesmo');
  });

  it('persiste composição e macros calculados no SQLite e reabre o vínculo', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'santo-maromba-custom-food-'));
    const databasePath = path.join(directory, 'fittrack.db');
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    const repo = new NutritionRepository(db);
    const foods = repo.getFoods();
    const rice = foods.find(food => food.id === 'food-arroz')!;
    const beans = foods.find(food => food.id === 'food-feijao')!;
    const created = repo.createCustomFood({
      name: 'Marmita caseira', category: 'carb', calories: 0, proteinG: 0, carbsG: 0, fatsG: 0,
      ingredients: [{ foodId: rice.id, amountG: 120 }, { foodId: beans.id, amountG: 80 }],
      finalWeightG: 170
    });
    const expected = calculateCustomFoodComposition(created.composition!, foods, 170);
    expect(created).toMatchObject({
      calories: expected.calories, proteinG: expected.proteinG, carbsG: expected.carbsG, fatsG: expected.fatsG,
      fiberG: expected.fiberG, compositionFinalWeightG: 170,
      composition: [{ foodId: rice.id, amountG: 120 }, { foodId: beans.id, amountG: 80 }], dataQuality: 'user_reported'
    });

    db.close();
    db = await createDatabaseDriver(databasePath);
    await runMigrations(db);
    const reopened = new NutritionRepository(db).getFoods().find(food => food.id === created.id);
    expect(reopened).toMatchObject({
      calories: expected.calories, proteinG: expected.proteinG, carbsG: expected.carbsG, fatsG: expected.fatsG,
      fiberG: expected.fiberG, compositionFinalWeightG: 170, composition: created.composition
    });
  });

  it('mantém composição e calcula os mesmos macros na PWA offline', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const foods = await api.getFoods();
    const rice = foods.find(food => food.id === 'food-arroz')!;
    const beans = foods.find(food => food.id === 'food-feijao')!;
    const saved = await api.saveCustomFood({
      name: 'Prato caseiro PWA', category: 'carb', calories: 0, proteinG: 0, carbsG: 0, fatsG: 0,
      ingredients: [{ foodId: rice.id, amountG: 120 }, { foodId: beans.id, amountG: 80 }], finalWeightG: 170
    });
    expect((await api.getFoods()).find(food => food.id === saved.id)).toMatchObject({
      calories: saved.calories, proteinG: saved.proteinG, composition: saved.composition, compositionFinalWeightG: 170
    });
  });
});
