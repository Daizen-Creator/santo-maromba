import { describe, expect, it } from 'vitest';
import { buildMealSchedule } from '../domain/meal-schedule';
import { NutritionTargets } from '../shared/types';

const targets: NutritionTargets = {
  bmr: 1600,
  tdee: 2400,
  targetCalories: 2750,
  proteinGrams: 165,
  carbGrams: 330,
  fatGrams: 80,
  proteinKcal: 660,
  carbKcal: 1320,
  fatKcal: 720,
  proteinPct: 24,
  carbPct: 48,
  fatPct: 26,
  waterMl: 2800,
  bmi: 24,
  bmiCategory: 'Normal',
  targetPaceKgPerWeek: 0.2,
  formulaUsed: 'Mifflin-St Jeor'
};

describe('Plano diário de refeições', () => {
  it.each([3, 4, 5, 6])('gera exatamente %i blocos e horários únicos', count => {
    const meals = buildMealSchedule(count, targets);

    expect(meals).toHaveLength(count);
    expect(new Set(meals.map(meal => meal.time)).size).toBe(count);
    expect(meals.every(meal => meal.target !== undefined)).toBe(true);
  });

  it('distribui os macros por horário sem perder o total diário', () => {
    const meals = buildMealSchedule(6, targets);

    expect(meals.reduce((sum, meal) => sum + meal.target!.calories, 0)).toBe(targets.targetCalories);
    expect(meals.reduce((sum, meal) => sum + meal.target!.proteinG, 0)).toBe(targets.proteinGrams);
    expect(meals.reduce((sum, meal) => sum + meal.target!.carbsG, 0)).toBe(targets.carbGrams);
    expect(meals.reduce((sum, meal) => sum + meal.target!.fatsG, 0)).toBe(targets.fatGrams);
  });

  it('não inventa metas quando ainda não há cálculo válido', () => {
    const meals = buildMealSchedule(5, null);
    expect(meals).toHaveLength(5);
    expect(meals.every(meal => meal.target === undefined)).toBe(true);
  });
});
