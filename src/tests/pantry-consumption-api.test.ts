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
    await api.updatePantry('food-arroz', 500);
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
  });
});
