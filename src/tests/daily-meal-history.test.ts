import { describe, expect, it } from 'vitest';
import { filterDailyMealHistory } from '../domain/daily-meal-history';
import { DailyMealEntry } from '../shared/types';

const record = (overrides: Partial<DailyMealEntry>): DailyMealEntry => ({
  id: 'entry', date: '2026-10-21', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00',
  status: 'consumed', items: [{
    itemId: 'rice', foodId: 'rice', foodName: 'Arroz integral', plannedAmountG: 100, consumedAmountG: 80,
    calories: 124, proteinG: 2.6, carbsG: 25.8, fatsG: 1
  }], calories: 99.2, proteinG: 2.1, carbsG: 20.6, fatsG: 0.8, updatedAt: '2026-10-21T12:30:00.000Z',
  ...overrides
});

describe('Pesquisa de histórico alimentar', () => {
  it('filtra por intervalo, alimento ou anotação sem diferenciar acentos', () => {
    const entries = [
      record({ id: 'today', date: '2026-10-22', note: 'refeição após o treino' }),
      record({ id: 'yesterday', date: '2026-10-21' }),
      record({ id: 'older', date: '2026-10-20' })
    ];
    const result = filterDailyMealHistory(entries, { fromDate: '2026-10-21', toDate: '2026-10-22', search: 'integral' });
    expect(result.map(entry => entry.id)).toEqual(['today', 'yesterday']);
    expect(filterDailyMealHistory(entries, { fromDate: '2026-10-20', toDate: '2026-10-22', search: 'refeicao' })[0].id)
      .toBe('today');
    expect(filterDailyMealHistory(entries, { fromDate: '2026-10-21', toDate: '2026-10-21', search: 'jantar' })).toEqual([]);
  });
});
