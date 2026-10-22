import { DashboardSummary, NutritionTargets } from '../shared/types';

export interface NutritionBalanceMetric {
  target: number;
  consumed: number;
  remaining: number;
}

export interface NutritionBalance {
  calories: NutritionBalanceMetric | null;
  proteinG: NutritionBalanceMetric | null;
  carbsG: NutritionBalanceMetric | null;
  fatsG: NutritionBalanceMetric | null;
}

export type NutritionBalanceTargets = Pick<NutritionTargets, 'targetCalories' | 'proteinGrams' | 'carbGrams' | 'fatGrams'>;
export type NutritionBalanceConsumption = Pick<DashboardSummary, 'caloriesLogged' | 'proteinLoggedG' | 'carbsLoggedG' | 'fatsLoggedG'>;

function metric(target: number | null | undefined, consumed: number | null | undefined): NutritionBalanceMetric | null {
  if (target == null || consumed == null || !Number.isFinite(target) || !Number.isFinite(consumed) || target < 0 || consumed < 0) {
    return null;
  }
  return { target, consumed, remaining: target - consumed };
}

export function calculateNutritionBalance(
  targets: NutritionBalanceTargets | null | undefined,
  summary: NutritionBalanceConsumption | null | undefined
): NutritionBalance {
  return {
    calories: metric(targets?.targetCalories, summary?.caloriesLogged),
    proteinG: metric(targets?.proteinGrams, summary?.proteinLoggedG),
    carbsG: metric(targets?.carbGrams, summary?.carbsLoggedG),
    fatsG: metric(targets?.fatGrams, summary?.fatsLoggedG)
  };
}
