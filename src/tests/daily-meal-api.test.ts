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
  });
});
