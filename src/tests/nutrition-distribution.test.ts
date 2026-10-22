import { describe, expect, it } from 'vitest';
import { calculateNutritionDistribution } from '../domain/nutrition-distribution';
import { DailyMealEntry } from '../shared/types';

const entry = (status: DailyMealEntry['status'], id: string, date = '2026-10-22'): DailyMealEntry => ({
  id, date, slotId: id, mealName: id, scheduledTime: '12:00', status,
  items: [], calories: 400, proteinG: 30, carbsG: 40, fatsG: 10, completedAt: '2026-10-22T12:30:00.000Z', updatedAt: '2026-10-22T12:30:00.000Z'
});

describe('Distribuição real por refeição', () => {
  it('combina registros rápidos e checklist consumido, sem contar planos pendentes', () => {
    const result = calculateNutritionDistribution('2026-10-22', [
      entry('pending', 'Plano pendente'),
      entry('partial', 'Almoço')
    ], [{
      id: 'quick-1', date: '2026-10-22', mealName: 'Lanche', calories: 200,
      proteinG: 10, carbsG: 20, fatsG: 5, loggedAt: '2026-10-22T10:30:00.000Z'
    }]);
    expect(result).toEqual([
      { id: 'quick-1', mealName: 'Lanche', source: 'quick_log', loggedAt: '2026-10-22T10:30:00.000Z', calories: 200, proteinG: 10, carbsG: 20, fatsG: 5 },
      { id: 'Almoço', mealName: 'Almoço', source: 'checklist', loggedAt: '2026-10-22T12:30:00.000Z', calories: 400, proteinG: 30, carbsG: 40, fatsG: 10 }
    ]);
  });

  it('ignora datas diferentes, nomes vazios e macros inválidos', () => {
    const result = calculateNutritionDistribution('2026-10-22', [entry('consumed', 'Outro dia', '2026-10-21')], [
      { date: '2026-10-21', mealName: 'Ontem', calories: 300, proteinG: 20, carbsG: 30, fatsG: 5 },
      { date: '2026-10-22', mealName: '   ', calories: 300, proteinG: 20, carbsG: 30, fatsG: 5 },
      { date: '2026-10-22', mealName: 'Inválido', calories: -1, proteinG: 20, carbsG: 30, fatsG: 5 }
    ]);
    expect(result).toEqual([]);
  });
});
