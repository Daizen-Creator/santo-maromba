import { describe, expect, it } from 'vitest';
import { summarizeDailyMealStatuses } from '../domain/meal-status-summary';

describe('Resumo dos estados do checklist alimentar', () => {
  it('conta os horários planejados como pendentes e classifica todos os estados registrados', () => {
    const counts = summarizeDailyMealStatuses(['breakfast', 'lunch', 'dinner'], [
      { slotId: 'lunch', status: 'partial' },
      { slotId: 'dinner', status: 'deferred' },
      { slotId: 'extra', status: 'skipped' },
      { slotId: 'other', status: 'cancelled' },
      { slotId: 'another', status: 'preparing' },
      { slotId: 'last', status: 'consumed' }
    ]);

    expect(counts).toEqual({
      pending: 1, preparing: 1, consumed: 1, partial: 1, deferred: 1, skipped: 1, cancelled: 1
    });
  });

  it('não duplica horários repetidos no plano nem em dados salvos', () => {
    const counts = summarizeDailyMealStatuses(['breakfast', 'breakfast'], [
      { slotId: 'breakfast', status: 'consumed' },
      { slotId: 'breakfast', status: 'consumed' }
    ]);
    expect(counts.consumed).toBe(1);
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(1);
  });
});
