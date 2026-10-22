import { DailyMealEntry, DailyMealItemLog } from '../shared/types';

export interface MealMacros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
}

export interface MealNutritionComparison {
  planned: MealMacros;
  consumed: MealMacros | null;
  difference: MealMacros | null;
}

export function compareMealNutrition(
  plannedItems: DailyMealItemLog[],
  entry?: DailyMealEntry | null
): MealNutritionComparison {
  const planned = plannedItems.reduce((sum, item) => ({
    calories: sum.calories + item.calories,
    proteinG: sum.proteinG + item.proteinG,
    carbsG: sum.carbsG + item.carbsG,
    fatsG: sum.fatsG + item.fatsG
  }), { calories: 0, proteinG: 0, carbsG: 0, fatsG: 0 });
  if (!entry || (entry.status !== 'consumed' && entry.status !== 'partial')) {
    return { planned, consumed: null, difference: null };
  }
  const consumed = {
    calories: entry.calories,
    proteinG: entry.proteinG,
    carbsG: entry.carbsG,
    fatsG: entry.fatsG
  };
  return {
    planned,
    consumed,
    difference: {
      calories: consumed.calories - planned.calories,
      proteinG: consumed.proteinG - planned.proteinG,
      carbsG: consumed.carbsG - planned.carbsG,
      fatsG: consumed.fatsG - planned.fatsG
    }
  };
}
