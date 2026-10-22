import { DailyMealEntry, LoggedMealInput, NutritionMealDistributionEntry } from '../shared/types';
import { inferMealTurn } from './meal-turn';

export interface LoggedMealDistributionInput extends LoggedMealInput {
  id?: string;
  loggedAt?: string;
}

const isValidMacros = (values: number[]) => values.every(value => Number.isFinite(value) && value >= 0);

export function calculateNutritionDistribution(
  date: string,
  mealEntries: DailyMealEntry[],
  loggedMeals: LoggedMealDistributionInput[]
): NutritionMealDistributionEntry[] {
  const quickLogs = loggedMeals.flatMap((meal, index) => {
    if (meal.date !== date || !meal.mealName.trim() || !isValidMacros([meal.calories, meal.proteinG, meal.carbsG, meal.fatsG])) return [];
    return [{
      id: meal.id || `quick-${date}-${index}`,
      mealName: meal.mealName,
      mealTurn: meal.mealTurn || inferMealTurn('', meal.mealName),
      source: 'quick_log' as const,
      loggedAt: meal.loggedAt,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatsG: meal.fatsG
    }];
  });
  const checklistLogs = mealEntries.flatMap(meal => {
    if (meal.date !== date || (meal.status !== 'consumed' && meal.status !== 'partial')
      || !isValidMacros([meal.calories, meal.proteinG, meal.carbsG, meal.fatsG])) return [];
    return [{
      id: meal.id,
      mealName: meal.mealName,
      mealTurn: meal.mealTurn || inferMealTurn(meal.slotId, meal.mealName),
      source: 'checklist' as const,
      loggedAt: meal.completedAt,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatsG: meal.fatsG
    }];
  });
  return [...quickLogs, ...checklistLogs].sort((left, right) =>
    (left.loggedAt || '').localeCompare(right.loggedAt || '') || left.mealName.localeCompare(right.mealName, 'pt-BR')
  );
}
