import { describe, expect, it } from 'vitest';
import { getAverageMealBudget, prioritizeRecipesForMealBudget } from '../domain/monthly-food-budget';
import { Recipe } from '../shared/types';

function makeRecipe(id: string, estimatedCost?: number, servings = 1): Recipe {
  return {
    id, name: id, category: 'lunch', prepTimeMinutes: 15, instructions: '', servings,
    ingredients: [], totalCalories: 500, totalProteinG: 30, totalCarbsG: 60, totalFatsG: 10,
    estimatedCost
  };
}

describe('planejamento alimentar com orçamento mensal', () => {
  it('divide o orçamento pelos dias reais do mês e pelas refeições planejadas', () => {
    expect(getAverageMealBudget(300, 5, '2026-04-15')).toBe(2);
    expect(getAverageMealBudget(300, 5, '2026-05-15')).toBeCloseTo(300 / 31 / 5);
    expect(getAverageMealBudget(290, 5, '2024-02-29')).toBe(2);
    expect(getAverageMealBudget(0, 6, '2026-10-22')).toBe(0);
    expect(getAverageMealBudget(undefined, 5, '2026-10-22')).toBeUndefined();
    expect(getAverageMealBudget(100, 5, '2026-02-30')).toBeUndefined();
  });

  it('prioriza receitas dentro do teto, mantém a ordem nutricional entre elas e não inventa preço ausente', () => {
    const overBudget = makeRecipe('acima', 4);
    const unknownCost = makeRecipe('sem-preco');
    const affordableBatch = makeRecipe('compativel', 20, 10);

    expect(prioritizeRecipesForMealBudget([overBudget, unknownCost, affordableBatch], 2)
      .map(recipe => recipe.id)).toEqual(['compativel', 'sem-preco', 'acima']);
  });

  it('quando nenhuma opção cabe, sugere primeiro a que menos ultrapassa o teto', () => {
    const expensive = makeRecipe('mais-cara', 12);
    const closer = makeRecipe('mais-proxima', 5);
    expect(prioritizeRecipesForMealBudget([expensive, closer], 2).map(recipe => recipe.id))
      .toEqual(['mais-proxima', 'mais-cara']);
  });
});
