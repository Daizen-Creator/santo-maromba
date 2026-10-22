import { Recipe, RecipeIngredient } from '../shared/types';

export interface RecipeNutritionTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
}

const roundOneDecimal = (value: number): number => Math.round((value + Number.EPSILON) * 10) / 10;

export function normalizeRecipeServings(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 50) {
    throw new Error('O rendimento deve ser um número inteiro entre 1 e 50 porções.');
  }
  return value;
}

export function normalizeRecipeFinalWeight(value: number | null): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 1 || value > 50000) {
    throw new Error('O peso final deve ficar entre 1 g e 50.000 g.');
  }
  return roundOneDecimal(value);
}

export function getRecipeNutritionPer100g(recipe: Recipe): RecipeNutritionTotals | null {
  const finalWeightG = recipe.finalWeightG;
  if (finalWeightG === undefined || finalWeightG === null) return null;
  const weight = normalizeRecipeFinalWeight(finalWeightG);
  if (weight === null) return null;
  const scale = 100 / weight;
  return {
    calories: roundOneDecimal(recipe.totalCalories * scale),
    proteinG: roundOneDecimal(recipe.totalProteinG * scale),
    carbsG: roundOneDecimal(recipe.totalCarbsG * scale),
    fatsG: roundOneDecimal(recipe.totalFatsG * scale)
  };
}

export function getRecipeNutritionPerServing(recipe: Recipe): RecipeNutritionTotals {
  const servings = normalizeRecipeServings(recipe.servings ?? 1);
  const ingredients = recipe.ingredients.map(ingredient => getIngredientPerServing(ingredient, servings));
  if (ingredients.length === 0) {
    return {
      calories: Math.round(recipe.totalCalories / servings),
      proteinG: roundOneDecimal(recipe.totalProteinG / servings),
      carbsG: roundOneDecimal(recipe.totalCarbsG / servings),
      fatsG: roundOneDecimal(recipe.totalFatsG / servings)
    };
  }
  return {
    calories: ingredients.reduce((total, ingredient) => total + ingredient.calories, 0),
    proteinG: roundOneDecimal(ingredients.reduce((total, ingredient) => total + ingredient.proteinG, 0)),
    carbsG: roundOneDecimal(ingredients.reduce((total, ingredient) => total + ingredient.carbsG, 0)),
    fatsG: roundOneDecimal(ingredients.reduce((total, ingredient) => total + ingredient.fatsG, 0))
  };
}

export function getIngredientPerServing(ingredient: RecipeIngredient, servings: number): RecipeIngredient {
  const count = normalizeRecipeServings(servings);
  return {
    ...ingredient,
    amountG: roundOneDecimal(ingredient.amountG / count),
    calories: Math.round(ingredient.calories / count),
    proteinG: roundOneDecimal(ingredient.proteinG / count),
    carbsG: roundOneDecimal(ingredient.carbsG / count),
    fatsG: roundOneDecimal(ingredient.fatsG / count)
  };
}
