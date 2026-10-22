import { PantryItem, Recipe } from '../shared/types';

export function getRecipeCostPerServing(recipe: Recipe): number | undefined {
  if (recipe.estimatedCost === undefined || !Number.isFinite(recipe.estimatedCost) || recipe.estimatedCost < 0) return undefined;
  const servings = recipe.servings ?? 1;
  if (!Number.isFinite(servings) || servings <= 0) return undefined;
  return recipe.estimatedCost / servings;
}

export function getRecipeCostPerGramProtein(recipe: Recipe): number | undefined {
  if (recipe.estimatedCost === undefined || !Number.isFinite(recipe.estimatedCost) || recipe.estimatedCost < 0) return undefined;
  if (!Number.isFinite(recipe.totalProteinG) || recipe.totalProteinG <= 0) return undefined;
  return recipe.estimatedCost / recipe.totalProteinG;
}

export function resolveRecipeCost(recipe: Recipe, pantry: PantryItem[]): Recipe {
  const priceByFood = new Map(pantry
    .filter(item => item.unitPrice !== undefined && item.priceSource && item.priceUpdatedAt)
    .map(item => [item.foodId, item.unitPrice!]));

  if (recipe.ingredients.length > 0 && recipe.ingredients.every(ingredient => priceByFood.has(ingredient.foodId))) {
    const cost = recipe.ingredients.reduce(
      (sum, ingredient) => sum + (priceByFood.get(ingredient.foodId)! * ingredient.amountG / 1000), 0
    );
    return { ...recipe, estimatedCost: Number(cost.toFixed(2)), costSource: 'user_prices' };
  }

  return {
    ...recipe,
    costSource: recipe.estimatedCost === undefined ? undefined : 'catalog_estimate'
  };
}
