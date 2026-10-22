import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../renderer/services/api';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear(),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  } as Storage;
}

describe('custo real da receita no armazenamento offline', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('calcula custo com preços cadastrados de todos os ingredientes e o recupera após ler novamente', async () => {
    const foodIds = new Set((await api.getFoods()).map(food => food.id));
    const recipes = await api.getRecipes();
    const recipe = recipes.find(item => item.ingredients.length > 0 && item.ingredients.every(ingredient => foodIds.has(ingredient.foodId)))!;
    const priceByFood = new Map<string, number>();
    recipe.ingredients.forEach((ingredient, index) => {
      const price = 12 + index;
      priceByFood.set(ingredient.foodId, price);
    });
    for (const [foodId, price] of priceByFood) {
      await api.updatePantryPrice({ foodId, unitPrice: price, priceSource: 'Pesquisa manual' });
    }
    const expectedCost = Number(recipe.ingredients.reduce((sum, ingredient) => sum + priceByFood.get(ingredient.foodId)! * ingredient.amountG / 1000, 0).toFixed(2));
    expect((await api.getRecipes()).find(item => item.id === recipe.id)).toMatchObject({ estimatedCost: expectedCost, costSource: 'user_prices' });
  });
});
