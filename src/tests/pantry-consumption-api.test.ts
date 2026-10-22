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

describe('despensa e consumo no armazenamento offline da PWA', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('valida estoque, desconta consumo sem duplicar e persiste a reabertura e o desfazer', async () => {
    await api.updatePantry('food-arroz', 500, '2026-10-28');
    await api.updatePantryPrice({ foodId: 'food-arroz', unitPrice: 25.5, priceSource: 'Mercado do bairro' });
    expect((await api.getPantry()).find(item => item.foodId === 'food-arroz')).toMatchObject({
      amountAvailableG: 500, unitPrice: 25.5, priceSource: 'Mercado do bairro'
    });
    expect((await api.getPantry()).find(item => item.foodId === 'food-arroz')?.expiresAt).toBe('2026-10-28');
    await expect(api.updatePantry('food-arroz', 500, '2026-02-30')).rejects.toThrow();
    const food = (await api.getFoods()).find(item => item.id === 'food-arroz')!;
    const input = {
      date: '2026-10-22', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00', status: 'consumed' as const,
      items: [{ itemId: 'rice-1', foodId: food.id, foodName: food.name, plannedAmountG: 200, consumedAmountG: 200,
        calories: food.calories * 2, proteinG: food.proteinG * 2, carbsG: food.carbsG * 2, fatsG: food.fatsG * 2 }]
    };
    const saved = await api.saveDailyMeal(input);
    expect((await api.getPantry()).find(item => item.foodId === food.id)?.amountAvailableG).toBe(300);

    await api.saveDailyMeal(input);
    expect((await api.getPantry()).find(item => item.foodId === food.id)?.amountAvailableG).toBe(300);
    await expect(api.updatePantry(food.id, -1)).rejects.toThrow();

    const deleted = await api.deleteDailyMeal({ date: input.date, slotId: input.slotId });
    expect((await api.getPantry()).find(item => item.foodId === food.id)?.amountAvailableG).toBe(500);
    await api.restoreDailyMeal(deleted);
    expect((await api.getPantry()).find(item => item.foodId === food.id)?.amountAvailableG).toBe(300);
    expect(saved.status).toBe('consumed');

    await api.updatePantry(food.id, 300, undefined, true);
    await api.saveDailyMeal(input);
    expect((await api.getPantry()).find(item => item.foodId === food.id))
      .toMatchObject({ amountAvailableG: 300, isLeftover: true });
  });

  it('persiste o marcador de sobra e o usa para reordenar receitas offline', async () => {
    await api.updatePantry('food-arroz', 500, undefined, true);
    expect((await api.getPantry()).find(item => item.foodId === 'food-arroz')?.isLeftover).toBe(true);
    const prioritized = await api.findRecipesFromPantry({ maxPrepTime: 360 });
    expect(prioritized[0]?.leftoverUseGrams).toBeGreaterThan(0);
    expect(prioritized[0]?.leftoverIngredientCount).toBeGreaterThan(0);

    await api.updatePantry('food-arroz', 500, undefined, false);
    expect((await api.getPantry()).find(item => item.foodId === 'food-arroz')?.isLeftover).toBe(false);
    expect((await api.findRecipesFromPantry({ maxPrepTime: 360 })).every(recipe => recipe.leftoverUseGrams === 0)).toBe(true);
  });
});
