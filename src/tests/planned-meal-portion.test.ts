import { describe, expect, it } from 'vitest';
import { getMaxPlannedAmountG, scalePlannedMealItem } from '../domain/planned-meal-portion';

const rice = {
  itemId: 'rice-0', foodId: 'rice', foodName: 'Arroz', plannedAmountG: 100, consumedAmountG: 45,
  calories: 130, proteinG: 2.5, carbsG: 28, fatsG: 0.3
};

describe('Porções planejadas de refeições', () => {
  it('recalcula macros proporcionalmente e preserva os gramas consumidos', () => {
    const scaled = scalePlannedMealItem(rice, 150);
    expect(scaled).toMatchObject({ plannedAmountG: 150, calories: 195, proteinG: 3.75, carbsG: 42, consumedAmountG: 45 });
    expect(scaled.fatsG).toBeCloseTo(0.45);
  });

  it('limita quantidades para que os macros permaneçam dentro do contrato persistido', () => {
    expect(getMaxPlannedAmountG({ ...rice, calories: 900 })).toBe(1111);
    expect(() => scalePlannedMealItem(rice, 0)).toThrow(RangeError);
    expect(() => scalePlannedMealItem(rice, 5001)).toThrow(RangeError);
  });
});
