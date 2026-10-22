import { describe, expect, it } from 'vitest';
import { getIngredientPerServing, getRecipeNutritionPerServing, normalizeRecipeServings } from '../domain/recipe-portions';
import { INITIAL_RECIPES } from '../database/seeds/nutrition-seeds';

describe('Rendimento e valores nutricionais por porção', () => {
  it('divide macros e quantidades do lote pelo rendimento informado', () => {
    const recipe = {
      ...INITIAL_RECIPES[0],
      servings: 2,
      ingredients: [{
        ...INITIAL_RECIPES[0].ingredients[0],
        amountG: 80,
        calories: 501,
        proteinG: 31.2,
        carbsG: 48.4,
        fatsG: 12.6
      }],
      totalCalories: 501,
      totalProteinG: 31.2,
      totalCarbsG: 48.4,
      totalFatsG: 12.6
    };
    const portion = getRecipeNutritionPerServing(recipe);
    const ingredient = getIngredientPerServing({
      foodId: 'oats', foodName: 'Aveia', amountG: 80, calories: 300,
      proteinG: 10.1, carbsG: 50.3, fatsG: 5.5
    }, recipe.servings!);

    expect(portion).toEqual({ calories: 251, proteinG: 15.6, carbsG: 24.2, fatsG: 6.3 });
    expect(ingredient).toMatchObject({ amountG: 40, calories: 150, proteinG: 5.1, carbsG: 25.2, fatsG: 2.8 });
  });

  it('rejeita rendimento inválido e limita as receitas a 50 porções', () => {
    expect(normalizeRecipeServings(1)).toBe(1);
    expect(normalizeRecipeServings(50)).toBe(50);
    expect(() => normalizeRecipeServings(0)).toThrow('O rendimento deve ser um número inteiro');
    expect(() => normalizeRecipeServings(1.5)).toThrow('O rendimento deve ser um número inteiro');
    expect(() => normalizeRecipeServings(51)).toThrow('O rendimento deve ser um número inteiro');
  });
});
