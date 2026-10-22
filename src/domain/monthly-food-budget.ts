import { Recipe } from '../shared/types';
import { getRecipeCostPerServing } from './recipe-cost';

export function getAverageMealBudget(
  monthlyBudget: number | undefined,
  mealsPerDay: number,
  date: string
): number | undefined {
  if (monthlyBudget === undefined || !Number.isFinite(monthlyBudget) || monthlyBudget < 0) return undefined;
  if (!Number.isInteger(mealsPerDay) || mealsPerDay < 1) return undefined;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (parsedDate.getUTCFullYear() !== year || parsedDate.getUTCMonth() !== month - 1 || parsedDate.getUTCDate() !== day) {
    return undefined;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return monthlyBudget / daysInMonth / mealsPerDay;
}

export function prioritizeRecipesForMealBudget<T extends Recipe>(recipes: T[], budgetPerMeal?: number): T[] {
  if (budgetPerMeal === undefined || !Number.isFinite(budgetPerMeal) || budgetPerMeal < 0) return [...recipes];

  return recipes.map((recipe, index) => {
    const costPerServing = getRecipeCostPerServing(recipe);
    return {
      recipe,
      index,
      costPerServing,
      budgetTier: costPerServing === undefined ? 1 : costPerServing <= budgetPerMeal ? 0 : 2
    };
  }).sort((left, right) => {
    if (left.budgetTier !== right.budgetTier) return left.budgetTier - right.budgetTier;
    if (left.budgetTier === 2 && right.budgetTier === 2) {
      return left.costPerServing! - right.costPerServing! || left.index - right.index;
    }
    return left.index - right.index;
  }).map(item => item.recipe);
}
