import { describe, expect, it } from 'vitest';
import { calculateNutritionAnalytics } from '../domain/nutrition-analytics';

const query = { fromDate: '2026-10-16', toDate: '2026-10-22' };

describe('Médias nutricionais por dias registrados', () => {
  it('combina registros rápidos e checklist consumido, ignora planejamento e calcula média nos dias com dados', () => {
    const result = calculateNutritionAnalytics(query, [
      { id: 'day1', date: '2026-10-20', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00', status: 'consumed', items: [], calories: 500, proteinG: 30, carbsG: 60, fatsG: 12, updatedAt: '' },
      { id: 'day2-pending', date: '2026-10-21', slotId: 'dinner', mealName: 'Jantar', scheduledTime: '19:00', status: 'pending', items: [], calories: 0, proteinG: 0, carbsG: 0, fatsG: 0, updatedAt: '' },
      { id: 'day2-partial', date: '2026-10-21', slotId: 'breakfast', mealName: 'Café', scheduledTime: '08:00', status: 'partial', items: [], calories: 300, proteinG: 20, carbsG: 35, fatsG: 8, updatedAt: '' }
    ], [
      { date: '2026-10-20', mealName: 'Lanche', calories: 100, proteinG: 5, carbsG: 10, fatsG: 3 }
    ]);

    expect(result.trackedDays).toBe(2);
    expect(result.days).toEqual([
      { date: '2026-10-20', calories: 600, proteinG: 35, carbsG: 70, fatsG: 15, mealsLogged: 2 },
      { date: '2026-10-21', calories: 300, proteinG: 20, carbsG: 35, fatsG: 8, mealsLogged: 1 }
    ]);
    expect(result.averages).toEqual({ calories: 450, proteinG: 27.5, carbsG: 52.5, fatsG: 11.5 });
  });

  it('retorna médias ausentes em vez de apresentar zeros sem consumo registrado', () => {
    expect(calculateNutritionAnalytics(query, [], []).averages).toBeNull();
  });

  it('ignora registros fora do período e macros corrompidos', () => {
    const result = calculateNutritionAnalytics(query, [], [
      { date: '2026-10-15', mealName: 'Antes do período', calories: 100, proteinG: 1, carbsG: 1, fatsG: 1 },
      { date: '2026-10-20', mealName: 'Inválido', calories: Number.NaN, proteinG: 1, carbsG: 1, fatsG: 1 }
    ]);
    expect(result.days).toEqual([]);
    expect(result.averages).toBeNull();
  });
});
