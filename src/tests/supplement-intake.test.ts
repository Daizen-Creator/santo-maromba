import { describe, expect, it } from 'vitest';
import { getSupplementHistory, buildSupplementMealInput } from '../domain/supplement-intake';
import { FoodItem, DailyMealEntry } from '../shared/types';
import { INITIAL_FOODS } from '../database/seeds/nutrition-seeds';

const whey = INITIAL_FOODS.find(food => food.id === 'food-whey')!;

describe('Registro e histórico de suplementos', () => {
  it('calcula macros pela dose informada e cria lançamento de consumo no diário', () => {
    const entry = buildSupplementMealInput({
      food: whey, date: '2026-10-22', scheduledTime: '07:15', amountG: 30, slotId: 'supplement-20261022-a'
    });
    expect(entry).toMatchObject({
      date: '2026-10-22', slotId: 'supplement-20261022-a', mealTurn: 'snack', status: 'consumed',
      items: [{ foodId: 'food-whey', plannedAmountG: 30, consumedAmountG: 30, calories: 120, proteinG: 24 }]
    });
  });

  it('rejeita categoria inadequada, quantidade inválida e porção nutricional ausente', () => {
    expect(() => buildSupplementMealInput({ food: INITIAL_FOODS[0], date: '2026-10-22', scheduledTime: '07:15', amountG: 30, slotId: 'supplement-a' })).toThrow('classificado como suplemento');
    expect(() => buildSupplementMealInput({ food: whey, date: '2026-10-22', scheduledTime: '07:15', amountG: 0, slotId: 'supplement-a' })).toThrow('maior que zero');
    expect(() => buildSupplementMealInput({ food: { ...whey, servingSizeG: 0 }, date: '2026-10-22', scheduledTime: '07:15', amountG: 30, slotId: 'supplement-a' })).toThrow('porção nutricional');
  });

  it('mostra somente doses realmente consumidas e recalcula a porção parcial', () => {
    const entries: DailyMealEntry[] = [
      {
        id: 'supplement-partial', date: '2026-10-22', slotId: 'supplement-a', mealName: 'Whey', mealTurn: 'snack',
        scheduledTime: '07:15', status: 'partial', calories: 60, proteinG: 12, carbsG: 2.4, fatsG: 1.8,
        items: [{ itemId: 'whey-dose', foodId: whey.id, foodName: whey.name, plannedAmountG: 30, consumedAmountG: 15, calories: 120, proteinG: 24, carbsG: 4.8, fatsG: 3.6 }],
        updatedAt: '2026-10-22T07:20:00.000Z'
      },
      {
        id: 'supplement-pending', date: '2026-10-22', slotId: 'supplement-b', mealName: 'Whey futuro', mealTurn: 'snack',
        scheduledTime: '21:00', status: 'pending', calories: 0, proteinG: 0, carbsG: 0, fatsG: 0,
        items: [{ itemId: 'whey-pending', foodId: whey.id, foodName: whey.name, plannedAmountG: 30, consumedAmountG: 0, calories: 120, proteinG: 24, carbsG: 4.8, fatsG: 3.6 }],
        updatedAt: '2026-10-22T07:20:00.000Z'
      }
    ];
    const unrelatedFood: FoodItem = { ...whey, id: 'food-extra', name: 'Barra de cereal', category: 'carb' };
    const result = getSupplementHistory(entries, [whey, unrelatedFood]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ amountG: 15, calories: 60, proteinG: 12 });
  });
});
