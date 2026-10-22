import { DailyMealEntryInput, PantryItem } from '../shared/types';

export interface PantryConsumptionRecord {
  date: string;
  slotId: string;
  foodId: string;
  consumedG: number;
  deductedG: number;
  updatedAt: string;
}

export interface PantryConsumptionResult {
  pantry: PantryItem[];
  records: PantryConsumptionRecord[];
}

function consumedAmounts(meal: Pick<DailyMealEntryInput, 'status' | 'items'>): Map<string, number> {
  const amounts = new Map<string, number>();
  if (meal.status !== 'consumed' && meal.status !== 'partial') return amounts;
  for (const item of meal.items) {
    if (!item.foodId || !Number.isFinite(item.consumedAmountG) || item.consumedAmountG <= 0) continue;
    amounts.set(item.foodId, (amounts.get(item.foodId) || 0) + item.consumedAmountG);
  }
  return amounts;
}

/** Applies only the newly recorded consumption and safely reverses edits/deletions. */
export function reconcilePantryConsumption(
  meal: DailyMealEntryInput,
  pantry: PantryItem[],
  existingRecords: PantryConsumptionRecord[],
  updatedAt = new Date().toISOString()
): PantryConsumptionResult {
  const byFood = new Map(pantry.map(item => [item.foodId, { ...item }]));
  const previousByFood = new Map(existingRecords
    .filter(record => record.date === meal.date && record.slotId === meal.slotId)
    .map(record => [record.foodId, record]));
  const nextAmounts = consumedAmounts(meal);
  const allFoodIds = new Set([...previousByFood.keys(), ...nextAmounts.keys()]);
  const nextRecords = existingRecords.filter(record => record.date !== meal.date || record.slotId !== meal.slotId);

  for (const foodId of allFoodIds) {
    const previous = previousByFood.get(foodId);
    const consumedG = nextAmounts.get(foodId) || 0;
    const previousConsumedG = previous?.consumedG || 0;
    let deductedG = previous?.deductedG || 0;
    const deltaG = consumedG - previousConsumedG;
    const stock = byFood.get(foodId);

    if (deltaG > 0 && stock) {
      const removed = Math.min(stock.amountAvailableG, deltaG);
      stock.amountAvailableG = Math.max(0, stock.amountAvailableG - removed);
      stock.updatedAt = updatedAt;
      deductedG += removed;
    } else if (deltaG < 0 && stock && deductedG > 0) {
      const returned = Math.min(deductedG, -deltaG);
      stock.amountAvailableG += returned;
      stock.updatedAt = updatedAt;
      deductedG -= returned;
    }

    if (consumedG > 0) {
      nextRecords.push({ date: meal.date, slotId: meal.slotId, foodId, consumedG, deductedG, updatedAt });
    }
  }

  return { pantry: [...byFood.values()], records: nextRecords };
}
