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

  it('mantém a porção planejada e o horário real ao editar uma refeição já consumida', async () => {
    const input = {
      date: '2026-10-24', slotId: 'breakfast', mealName: 'Café da manhã', scheduledTime: '07:30', status: 'partial' as const,
      items: [{ itemId: 'oat-0', foodId: 'oat', foodName: 'Aveia', plannedAmountG: 100, consumedAmountG: 40,
        calories: 300, proteinG: 12, carbsG: 50, fatsG: 6 }]
    };
    const first = await api.saveDailyMeal(input);
    const updated = await api.saveDailyMeal({
      ...input,
      items: [{ ...input.items[0], plannedAmountG: 150, calories: 450, proteinG: 18, carbsG: 75, fatsG: 9 }]
    });
    expect(updated.completedAt).toBe(first.completedAt);
    expect(updated.calories).toBe(120);
    expect((await api.getDailyMeals(input.date))[0].items[0]).toMatchObject({ plannedAmountG: 150, consumedAmountG: 40 });
  });

  it('salva modelos no armazenamento local e aplica apenas em horários vazios', async () => {
    const sourceDate = '2026-10-20';
    await api.saveDailyMeal({
      date: sourceDate, slotId: 'breakfast', mealName: 'Café da manhã', scheduledTime: '08:00', status: 'consumed',
      items: [{ itemId: 'oat-0', foodId: 'oat', foodName: 'Aveia', plannedAmountG: 50, consumedAmountG: 50, calories: 190, proteinG: 7, carbsG: 32, fatsG: 4 }]
    });
    const template = await api.saveMealTemplate({ name: 'Rotina manhã', sourceDate });
    expect((await api.getMealTemplates()).map(item => item.id)).toContain(template.id);
    expect(template.meals[0].items[0].consumedAmountG).toBe(0);
    await expect(api.saveMealTemplate({ name: 'rotina manhã', sourceDate })).rejects.toThrow('Já existe um modelo');

    await api.saveDailyMeal({
      date: '2026-10-21', slotId: 'breakfast', mealName: 'Já planejado', scheduledTime: '07:00', status: 'pending', items: []
    });
    const applied = await api.applyMealTemplate({ templateId: template.id, targetDate: '2026-10-21' });
    expect(applied).toMatchObject({ copiedCount: 0, skippedCount: 1 });
    expect(await api.getDailyMeals('2026-10-21')).toMatchObject([{ mealName: 'Já planejado' }]);
  });

  it('calcula médias web com registros reais e exclui água e refeições pendentes', async () => {
    const date = '2026-10-20';
    await api.addLoggedMeal({ date, mealName: 'Lanche', calories: 200, proteinG: 10, carbsG: 20, fatsG: 5 });
    await api.saveDailyMeal({
      date, slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00', status: 'partial',
      items: [{ itemId: 'rice-0', foodId: 'rice', foodName: 'Arroz', plannedAmountG: 100, consumedAmountG: 50, calories: 300, proteinG: 8, carbsG: 60, fatsG: 4 }]
    });
    await api.saveDailyMeal({
      date, slotId: 'dinner', mealName: 'Jantar planejado', scheduledTime: '19:00', status: 'pending',
      items: [{ itemId: 'egg-0', foodId: 'egg', foodName: 'Ovo', plannedAmountG: 100, consumedAmountG: 0, calories: 140, proteinG: 12, carbsG: 1, fatsG: 10 }]
    });
    await api.addHydrationLog({ date, amountMl: 500 });

    const analytics = await api.getNutritionAnalytics({ fromDate: date, toDate: '2026-10-22' });
    expect(analytics).toMatchObject({
      trackedDays: 1,
      averages: { calories: 350, proteinG: 14, carbsG: 50, fatsG: 7 },
      days: [{ date, mealsLogged: 2 }]
    });
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
