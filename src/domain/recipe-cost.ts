import { PantryItem, Recipe } from '../shared/types';

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
