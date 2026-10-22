import { DailyMealEntry, DailyMealEntryInput, FoodItem } from '../shared/types';

export interface SupplementHistoryRecord {
  date: string;
  scheduledTime: string;
  foodId: string;
  foodName: string;
  amountG: number;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
}

export function buildSupplementMealInput(input: {
  food: FoodItem;
  date: string;
  scheduledTime: string;
  amountG: number;
  slotId: string;
}): DailyMealEntryInput {
  const { food, date, scheduledTime, amountG, slotId } = input;
  if (food.category !== 'supplement') throw new Error('Selecione um item classificado como suplemento.');
  if (!Number.isFinite(amountG) || amountG <= 0 || amountG > 5000) throw new Error('Informe uma dose maior que zero e de até 5.000 g.');
  if (!Number.isFinite(food.servingSizeG) || food.servingSizeG <= 0) throw new Error('O alimento não tem porção nutricional válida.');
  const ratio = amountG / food.servingSizeG;

  return {
    date,
    slotId,
    mealName: `Suplemento · ${food.name}`,
    mealTurn: 'snack',
    scheduledTime,
    status: 'consumed',
    items: [{
      itemId: `${slotId}-dose`,
      foodId: food.id,
      foodName: food.name,
      plannedAmountG: amountG,
      consumedAmountG: amountG,
      calories: food.calories * ratio,
      proteinG: food.proteinG * ratio,
      carbsG: food.carbsG * ratio,
      fatsG: food.fatsG * ratio,
      dataQuality: food.dataQuality,
      dataSource: food.source,
      sourceReference: food.sourceReference,
      confidenceLevel: food.confidenceLevel
    }]
  };
}

export function getSupplementHistory(entries: DailyMealEntry[], foods: FoodItem[]): SupplementHistoryRecord[] {
  const supplementIds = new Set(foods.filter(food => food.category === 'supplement').map(food => food.id));
  return entries
    .filter(entry => entry.status === 'consumed' || entry.status === 'partial')
    .flatMap(entry => entry.items
      .filter(item => supplementIds.has(item.foodId) && item.consumedAmountG > 0)
      .map(item => {
        const consumedRatio = item.plannedAmountG > 0 ? item.consumedAmountG / item.plannedAmountG : null;
        return {
        date: entry.date,
        scheduledTime: entry.scheduledTime,
        foodId: item.foodId,
        foodName: item.foodName,
        amountG: item.consumedAmountG,
        calories: consumedRatio === null ? null : item.calories * consumedRatio,
        proteinG: consumedRatio === null ? null : item.proteinG * consumedRatio,
        carbsG: consumedRatio === null ? null : item.carbsG * consumedRatio,
        fatsG: consumedRatio === null ? null : item.fatsG * consumedRatio
        };
      }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.scheduledTime.localeCompare(a.scheduledTime));
}
