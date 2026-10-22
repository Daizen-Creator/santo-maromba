import { describe, expect, it } from 'vitest';
import { compareMealNutrition } from '../domain/meal-nutrition-comparison';

const item = {
  itemId: 'rice', foodId: 'rice', foodName: 'Arroz', plannedAmountG: 100, consumedAmountG: 0,
  calories: 130, proteinG: 2.5, carbsG: 28, fatsG: 0.3
};

describe('Comparação alimentar planejado versus consumido', () => {
  it('calcula o planejado pelos itens e a diferença pelo consumo persistido', () => {
    const entry = {
      id: 'meal-1', date: '2026-10-22', slotId: 'lunch', mealName: 'Almoço', scheduledTime: '12:00',
      status: 'partial' as const, items: [{ ...item, consumedAmountG: 50 }], calories: 65, proteinG: 1.25,
      carbsG: 14, fatsG: 0.15, updatedAt: '2026-10-22T12:30:00.000Z'
    };
    expect(compareMealNutrition([item], entry)).toEqual({
      planned: { calories: 130, proteinG: 2.5, carbsG: 28, fatsG: 0.3 },
      consumed: { calories: 65, proteinG: 1.25, carbsG: 14, fatsG: 0.15 },
      difference: { calories: -65, proteinG: -1.25, carbsG: -14, fatsG: -0.15 }
    });
  });

  it('não apresenta consumo estimado para refeições ainda não confirmadas', () => {
    const pending = {
      id: 'meal-2', date: '2026-10-22', slotId: 'dinner', mealName: 'Jantar', scheduledTime: '19:00',
      status: 'pending' as const, items: [item], calories: 0, proteinG: 0, carbsG: 0, fatsG: 0, updatedAt: ''
    };
    expect(compareMealNutrition([item], pending)).toMatchObject({
      planned: { calories: 130 }, consumed: null, difference: null
    });
    expect(compareMealNutrition([item])).toMatchObject({ consumed: null, difference: null });
  });
});
