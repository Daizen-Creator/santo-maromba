import { DailyMealItemLog, FoodItem } from '../shared/types';

export function createPlannedMealFoodItem(food: FoodItem, amountG = 100, itemId = `added-${food.id}`): DailyMealItemLog {
  if (!Number.isFinite(amountG) || amountG < 1 || amountG > 5000) {
    throw new RangeError('A quantidade planejada deve ficar entre 1 g e 5.000 g.');
  }
  if (!itemId.trim() || itemId.length > 140) throw new Error('O identificador do ingrediente é inválido.');
  const ratio = amountG / 100;
  return {
    itemId,
    foodId: food.id,
    foodName: food.name,
    plannedAmountG: amountG,
    consumedAmountG: 0,
    calories: food.calories * ratio,
    proteinG: food.proteinG * ratio,
    carbsG: food.carbsG * ratio,
    fatsG: food.fatsG * ratio,
    dataQuality: food.dataQuality ?? (food.isCustom ? 'user_reported' : 'unverified'),
    dataSource: food.source,
    sourceReference: food.sourceReference,
    confidenceLevel: food.confidenceLevel ?? 'unknown'
  };
}

export function removePlannedMealFoodItem(items: DailyMealItemLog[], itemId: string): DailyMealItemLog[] {
  if (!items.some(item => item.itemId === itemId)) return items;
  if (items.length <= 1) throw new Error('Mantenha pelo menos um ingrediente na refeição.');
  return items.filter(item => item.itemId !== itemId);
}
