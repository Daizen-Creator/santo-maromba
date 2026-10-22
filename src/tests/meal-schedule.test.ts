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

  it('distribui as refeições dentro da janela acordada e preserva a divisão de macros', () => {
    const meals = buildMealSchedule(5, targets, { wakeTime: '06:30', sleepTime: '22:30' });

    expect(meals.map(meal => meal.time)).toEqual(['07:00', '10:38', '14:15', '17:53', '21:30']);
    expect(meals[0].target?.calories).toBe(605);
    expect(meals.reduce((sum, meal) => sum + meal.target!.calories, 0)).toBe(targets.targetCalories);
  });

  it('distribui corretamente uma rotina que atravessa a meia-noite', () => {
    const meals = buildMealSchedule(4, null, { wakeTime: '21:00', sleepTime: '07:00' });
    expect(meals.map(meal => meal.time)).toEqual(['21:30', '00:20', '03:10', '06:00']);
  });

  it('mantém os horários-base quando a janela informada não comporta refeições espaçadas', () => {
    const defaultTimes = buildMealSchedule(6, null).map(meal => meal.time);
    const tightWindow = buildMealSchedule(6, null, { wakeTime: '08:00', sleepTime: '11:00' });
    expect(tightWindow.map(meal => meal.time)).toEqual(defaultTimes);
  });
});
