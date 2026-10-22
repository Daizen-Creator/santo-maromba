import { describe, expect, it } from 'vitest';
import { calculateNutritionBalance } from '../domain/nutrition-balance';

const targets = {
  bmr: 1500, tdee: 2200, targetCalories: 2000, proteinGrams: 150, carbGrams: 250, fatGrams: 70,
  proteinKcal: 600, carbKcal: 1000, fatKcal: 630, proteinPct: 27, carbPct: 45, fatPct: 28,
  waterMl: 2500, bmi: 24, bmiCategory: 'adequado', targetPaceKgPerWeek: 0, formulaUsed: 'test'
};

describe('Saldo real das metas nutricionais', () => {
  it('calcula o que resta por macro sem alterar os registros medidos', () => {
    expect(calculateNutritionBalance(targets, {
      caloriesLogged: 1600, proteinLoggedG: 100, carbsLoggedG: 180, fatsLoggedG: 55
    })).toEqual({
      calories: { target: 2000, consumed: 1600, remaining: 400 },
      proteinG: { target: 150, consumed: 100, remaining: 50 },
      carbsG: { target: 250, consumed: 180, remaining: 70 },
      fatsG: { target: 70, consumed: 55, remaining: 15 }
    });
  });

  it('identifica excesso e deixa valores sem consumo registrados como ausentes', () => {
    const balance = calculateNutritionBalance(targets, {
      caloriesLogged: 2100, proteinLoggedG: 170, carbsLoggedG: null, fatsLoggedG: null
    });
    expect(balance.calories?.remaining).toBe(-100);
    expect(balance.proteinG?.remaining).toBe(-20);
    expect(balance.carbsG).toBeNull();
    expect(balance.fatsG).toBeNull();
    expect(calculateNutritionBalance(targets, null).calories).toBeNull();
  });
});
