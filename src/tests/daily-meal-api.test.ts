import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../renderer/services/api';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  } as Storage;
}

describe('Checklist alimentar na versão web', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
  });

  it('persiste por data e horário e calcula somente a quantidade consumida', async () => {
    const input = {
      date: '2026-10-22',
      slotId: 'lunch',
      mealName: 'Almoço',
      scheduledTime: '13:00',
      status: 'partial' as const,
      items: [{
        itemId: 'rice-0', foodId: 'rice', foodName: 'Arroz', plannedAmountG: 100, consumedAmountG: 40,
        calories: 130, proteinG: 2.5, carbsG: 28, fatsG: 0.3
      }]
    };

    const first = await api.saveDailyMeal(input);
    expect(first.calories).toBe(52);
    expect((await api.getDailyMeals(input.date))).toHaveLength(1);

    await api.saveDailyMeal({ ...input, status: 'consumed', items: [{ ...input.items[0], consumedAmountG: 100 }] });
    const reopenedView = await api.getDailyMeals(input.date);
    expect(reopenedView).toHaveLength(1);
    expect(reopenedView[0].calories).toBe(130);
    expect(reopenedView[0].status).toBe('consumed');
    expect(await api.getRecentlyUsedFoods()).toMatchObject([{ foodId: 'rice', foodName: 'Arroz', lastAmountG: 100 }]);
    expect(await api.getMealHistory({ fromDate: input.date, toDate: input.date, search: 'arroz' }))
      .toMatchObject([{ date: input.date, mealName: 'Almoço' }]);
    expect(await api.getMealHistory({ fromDate: input.date, toDate: input.date, search: 'feijão' })).toEqual([]);
    const copied = await api.copyDailyMeals({ sourceDate: input.date, targetDate: '2026-10-23' });
    expect(copied).toMatchObject({ copiedCount: 1, skippedCount: 0 });
    expect(await api.getDailyMeals('2026-10-23')).toMatchObject([
      { status: 'pending', items: [{ foodId: 'rice', consumedAmountG: 0 }] }
    ]);
    await expect(api.copyDailyMeals({ sourceDate: input.date, targetDate: input.date })).rejects.toThrow();
  });

  it('mantém origem e qualidade nutricional nos ingredientes do catálogo web', async () => {
    const recipes = await api.getRecipes();
    const ingredients = recipes.flatMap(recipe => recipe.ingredients);

    expect(ingredients.length).toBeGreaterThan(0);
    expect(ingredients.every(item => ['verified', 'estimated', 'user_reported', 'unverified'].includes(item.dataQuality || ''))).toBe(true);
    expect(ingredients.every(item => item.dataSource && item.dataSource.length > 0)).toBe(true);
    expect(ingredients.some(item => item.dataQuality === 'estimated')).toBe(true);
    expect(ingredients.some(item => item.dataQuality === 'unverified')).toBe(true);
  });

  it('mantém alimentos pessoais e favoritos no armazenamento local da PWA', async () => {
    const saved = await api.saveCustomFood({
      name: 'Mingau da casa', category: 'carb', calories: 120, proteinG: 5,
      carbsG: 20, fatsG: 2, fiberG: 3
    });
    expect((await api.getFoods()).find(food => food.id === saved.id)?.dataQuality).toBe('user_reported');

    const updated = await api.saveCustomFood({
      name: 'Mingau da casa', category: 'carb', calories: 130, proteinG: 6,
      carbsG: 21, fatsG: 2, fiberG: 3
    }, saved.id);
    expect(updated.calories).toBe(130);
    await expect(api.saveCustomFood({
      name: 'mingau da casa', category: 'carb', calories: 120, proteinG: 5,
      carbsG: 20, fatsG: 2
    })).rejects.toThrow('Já existe um alimento com esse nome no catálogo.');

    const recipe = (await api.getRecipes())[0];
    await api.setRecipeFavorite(recipe.id, true);
    expect((await api.getRecipes()).find(item => item.id === recipe.id)?.isFavorite).toBe(true);
    await api.setRecipeFavorite(recipe.id, false);
    expect((await api.getRecipes()).find(item => item.id === recipe.id)?.isFavorite).toBe(false);
    await api.setRecipeServings(recipe.id, 3);
    expect((await api.getRecipes()).find(item => item.id === recipe.id)?.servings).toBe(3);
    await expect(api.setRecipeServings(recipe.id, 51)).rejects.toThrow('O rendimento deve ser um número inteiro');

    const food = (await api.getFoods())[0];
    await api.setFoodFavorite(food.id, true);
    expect((await api.getFoods()).find(item => item.id === food.id)?.isFavorite).toBe(true);
    await api.setFoodFavorite(food.id, false);
    expect((await api.getFoods()).find(item => item.id === food.id)?.isFavorite).toBe(false);
  });
});
