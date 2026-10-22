import { describe, expect, it } from 'vitest';
import { getRecentlyUsedFoods } from '../domain/recent-foods';
import { DailyMealEntry } from '../shared/types';

function entry(overrides: Partial<DailyMealEntry>): DailyMealEntry {
  return {
    id: 'meal', date: '2026-10-20', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00',
    status: 'consumed', items: [], calories: 0, proteinG: 0, carbsG: 0, fatsG: 0,
    updatedAt: '2026-10-20T12:00:00.000Z', ...overrides
  };
}

describe('Consulta de alimentos consumidos recentemente', () => {
  it('ignora planos não consumidos, agrega duplicatas da mesma refeição e ordena pelo uso mais recente', () => {
    const rice = {
      itemId: 'rice', foodId: 'rice', foodName: 'Arroz', plannedAmountG: 100, consumedAmountG: 40,
      calories: 130, proteinG: 2.5, carbsG: 28, fatsG: 0.3, dataQuality: 'estimated' as const,
      dataSource: 'Rótulo informado'
    };
    const beans = { ...rice, itemId: 'beans', foodId: 'beans', foodName: 'Feijão', consumedAmountG: 20 };
    const recent = getRecentlyUsedFoods([
      entry({ id: 'older', date: '2026-10-19', updatedAt: '2026-10-19T12:00:00.000Z', items: [rice] }),
      entry({ id: 'newer', date: '2026-10-20', updatedAt: '2026-10-20T12:30:00.000Z', items: [rice, { ...rice, itemId: 'rice-extra', consumedAmountG: 10 }, beans] }),
      entry({ id: 'pending', date: '2026-10-21', status: 'pending', updatedAt: '2026-10-21T12:00:00.000Z', items: [{ ...rice, consumedAmountG: 0 }] })
    ]);

    expect(recent.map(item => item.foodId)).toEqual(['rice', 'beans']);
    expect(recent[0]).toMatchObject({ lastUsedDate: '2026-10-20', lastAmountG: 50, useCount: 2, dataQuality: 'estimated' });
  });

  it('valida o limite de resultados', () => {
    expect(() => getRecentlyUsedFoods([], 0)).toThrow('O limite de alimentos recentes');
    expect(() => getRecentlyUsedFoods([], 1.5)).toThrow('O limite de alimentos recentes');
  });
});
