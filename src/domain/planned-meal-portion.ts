import { DailyMealItemLog } from '../shared/types';

const MAX_AMOUNT_G = 5000;

export function getMaxPlannedAmountG(item: DailyMealItemLog): number {
  if (!Number.isFinite(item.plannedAmountG) || item.plannedAmountG <= 0) return 0;
  const perServingLimits = [
    { value: item.calories, max: 10000 },
    { value: item.proteinG, max: 1000 },
    { value: item.carbsG, max: 2000 },
    { value: item.fatsG, max: 1000 }
  ];
  const nutritionBound = perServingLimits.reduce((bound, nutrient) => (
    nutrient.value > 0
      ? Math.min(bound, item.plannedAmountG * nutrient.max / nutrient.value)
      : bound
  ), MAX_AMOUNT_G);
  return Math.max(1, Math.min(MAX_AMOUNT_G, Math.floor(nutritionBound)));
}

export function scalePlannedMealItem(item: DailyMealItemLog, plannedAmountG: number): DailyMealItemLog {
  if (!Number.isFinite(plannedAmountG) || plannedAmountG < 1 || plannedAmountG > getMaxPlannedAmountG(item)) {
    throw new RangeError('A quantidade planejada excede os limites permitidos para este alimento.');
  }
  const ratio = plannedAmountG / item.plannedAmountG;
  return {
    ...item,
    plannedAmountG,
    calories: item.calories * ratio,
    proteinG: item.proteinG * ratio,
    carbsG: item.carbsG * ratio,
    fatsG: item.fatsG * ratio
  };
}
